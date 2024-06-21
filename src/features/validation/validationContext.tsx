import React, { useCallback, useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useHasPendingAttachments } from 'src/features/attachments/AttachmentsContext';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { BackendValidation } from 'src/features/validation/backendValidation/BackendValidation';
import { ExpressionValidation } from 'src/features/validation/expressionValidation/ExpressionValidation';
import { InvalidDataValidation } from 'src/features/validation/invalidDataValidation/InvalidDataValidation';
import { NodeValidation } from 'src/features/validation/nodeValidation/NodeValidation';
import { SchemaValidation } from 'src/features/validation/schemaValidation/SchemaValidation';
import {
  getVisibilityMask,
  hasValidationErrors,
  mergeFieldValidations,
  selectValidations,
} from 'src/features/validation/utils';
import { useVisibility } from 'src/features/validation/visibility/useVisibility';
import {
  onBeforeRowDelete,
  setVisibilityForAttachment,
  setVisibilityForNode,
} from 'src/features/validation/visibility/visibilityUtils';
import { useAsRef } from 'src/hooks/useAsRef';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { useWaitForState } from 'src/hooks/useWaitForState';
import type {
  BackendValidationIssueGroups,
  BaseValidation,
  ComponentValidations,
  DataModelValidations,
  FieldValidation,
  FieldValidations,
  ValidationContext,
  WaitForValidation,
} from 'src/features/validation';
import type { Visibility } from 'src/features/validation/visibility/visibilityUtils';
import type { WaitForState } from 'src/hooks/useWaitForState';
import type { IDataModelReference } from 'src/layout/common.generated';

interface NewStoreProps {
  validating: WaitForValidation;
}

interface Internals {
  isLoading: boolean;
  individualFieldValidations: {
    backend: DataModelValidations;
    expression: DataModelValidations;
    schema: DataModelValidations;
    invalidData: DataModelValidations;
  };
  issueGroupsProcessedLast: { [dataType: string]: BackendValidationIssueGroups | undefined };
  updateTaskValidations: (validations: BaseValidation[]) => void;
  updateComponentValidations: (componentId: string, validations: ComponentValidations[string]) => void;
  /**
   * updateDataModelValidations
   * if validations is undefined, nothing will be changed
   */
  updateDataModelValidations: (
    key: Exclude<keyof Internals['individualFieldValidations'], 'backend'>,
    dataType: string,
    validations?: FieldValidations,
  ) => void;
  updateBackendValidations: (
    backendValidations: { [dataType: string]: FieldValidations },
    savedDataType: string,
    issueGroupsProcessedLast: BackendValidationIssueGroups,
  ) => void;
  updateVisibility: (mutator: (visibility: Visibility) => void) => void;
  updateValidating: (validating: WaitForValidation) => void;
}

function initialCreateStore({ validating }: NewStoreProps) {
  return createStore<ValidationContext & Internals>()(
    immer((set) => ({
      // =======
      // Publicly exposed state
      state: {
        task: [],
        dataModels: {},
        components: {},
      },
      visibility: {
        mask: 0,
        children: {},
        items: [],
      },
      removeRowVisibilityOnDelete: (node, rowIndex) =>
        set((state) => {
          onBeforeRowDelete(node, rowIndex, state.visibility);
        }),
      setNodeVisibility: (nodes, newVisibility, rowIndex) =>
        set((state) => {
          nodes.forEach((node) => setVisibilityForNode(node, state.visibility, newVisibility, rowIndex));
        }),
      setAttachmentVisibility: (attachmentId, node, newVisibility) =>
        set((state) => {
          setVisibilityForAttachment(attachmentId, node, state.visibility, newVisibility);
        }),
      setShowAllErrors: (newValue) =>
        set((state) => {
          state.showAllErrors = newValue;
        }),
      showAllErrors: false,
      validating,

      // =======
      // Internal state
      isLoading: true,
      individualFieldValidations: {
        backend: {},
        expression: {},
        schema: {},
        invalidData: {},
      },
      issueGroupsProcessedLast: {},
      updateTaskValidations: (validations) =>
        set((state) => {
          state.state.task = validations;
        }),
      updateComponentValidations: (componentId, validations) =>
        set((state) => {
          state.state.components[componentId] = validations;
        }),
      updateDataModelValidations: (key, dataType, validations) =>
        set((state) => {
          if (validations) {
            state.individualFieldValidations[key][dataType] = validations;
            state.state.dataModels[dataType] = mergeFieldValidations(
              state.individualFieldValidations.backend[dataType],
              state.individualFieldValidations.invalidData[dataType],
              state.individualFieldValidations.schema[dataType],
              state.individualFieldValidations.expression[dataType],
            );
          }
        }),
      updateBackendValidations: (backendValidations, savedDataType, issueGroupsProcessedLast) =>
        set((state) => {
          state.issueGroupsProcessedLast[savedDataType] = issueGroupsProcessedLast;
          for (const [dataType, validations] of Object.entries(backendValidations)) {
            state.individualFieldValidations.backend[dataType] = validations;
            state.state.dataModels[dataType] = mergeFieldValidations(
              state.individualFieldValidations.backend[dataType],
              state.individualFieldValidations.invalidData[dataType],
              state.individualFieldValidations.schema[dataType],
              state.individualFieldValidations.expression[dataType],
            );
          }
        }),
      updateVisibility: (mutator) =>
        set((state) => {
          mutator(state.visibility);
        }),
      updateValidating: (newValidating) =>
        set((state) => {
          state.validating = newValidating;
        }),
    })),
  );
}

const {
  Provider,
  useSelector,
  useLaxSelector,
  useDelayedMemoSelector,
  useSelectorAsRef,
  useStore,
  useLaxSelectorAsRef,
} = createZustandContext({
  name: 'Validation',
  required: true,
  initialCreateStore,
  onReRender: (store, { validating }) => {
    store.getState().updateValidating(validating);
  },
});

export function ValidationProvider({ children }: PropsWithChildren) {
  const writableDataTypes = DataModels.useWritableDataTypes();
  const waitForSave = FD.useWaitForSave();
  const waitForStateRef = useRef<WaitForState<ValidationContext & Internals, unknown>>();
  const hasPendingAttachments = useHasPendingAttachments();
  const isPDF = useIsPdf();

  // Provide a promise that resolves when all pending validations have been completed
  const pendingAttachmentsRef = useAsRef(hasPendingAttachments);
  const waitForAttachments = useWaitForState(pendingAttachmentsRef);

  const validating: WaitForValidation = useCallback(
    async (forceSave = true) => {
      await waitForAttachments((state) => !state);

      // Wait until we've saved changed to backend, and we've processed the backend validations we got from that save
      const validationsFromSave = await waitForSave(forceSave);
      await waitForStateRef.current!((state) =>
        Object.keys(state.issueGroupsProcessedLast).every(
          (dataType) => state.issueGroupsProcessedLast[dataType] === validationsFromSave?.[dataType],
        ),
      );
    },
    [waitForAttachments, waitForSave],
  );

  const neverValidating = useCallback(() => Promise.resolve(), []);
  if (isPDF || !writableDataTypes.length) {
    return <Provider validating={neverValidating}>{children}</Provider>;
  }

  return (
    <Provider validating={validating}>
      <MakeWaitForState waitForStateRef={waitForStateRef} />
      <NodeValidation />
      {writableDataTypes.map((dataType) => (
        <DataModelValidations
          key={dataType}
          dataType={dataType}
        />
      ))}
      <BackendValidation dataTypes={writableDataTypes} />
      <ManageVisibility />
      {children}
    </Provider>
  );
}

function DataModelValidations({ dataType }: { dataType: string }) {
  return (
    <>
      <SchemaValidation dataType={dataType} />
      <ExpressionValidation dataType={dataType} />
      <InvalidDataValidation dataType={dataType} />
    </>
  );
}

function MakeWaitForState({
  waitForStateRef,
}: {
  waitForStateRef: React.MutableRefObject<WaitForState<ValidationContext & Internals, unknown> | undefined>;
}) {
  waitForStateRef.current = useWaitForState(useStore());
  return null;
}

function ManageVisibility() {
  const validations = useSelector((state) => state.state);
  const setVisibility = useSelector((state) => state.updateVisibility);
  const showAllErrors = useSelector((state) => state.showAllErrors);
  const setShowAllErrors = useSelector((state) => state.setShowAllErrors);

  useVisibility(validations, setVisibility);

  /**
   * Hide unbound errors as soon as possible.
   */
  useEffect(() => {
    if (showAllErrors) {
      const backendMask = getVisibilityMask(['Backend', 'CustomBackend']);
      const hasFieldErrors =
        Object.values(validations.dataModels)
          .flatMap((fields) => Object.values(fields))
          .flatMap((field) => selectValidations(field, backendMask, 'error')).length > 0;

      if (!hasFieldErrors && !hasValidationErrors(validations.task)) {
        setShowAllErrors(false);
      }
    }
  }, [setShowAllErrors, showAllErrors, validations.dataModels, validations.task]);

  return null;
}

/**
 * This hook returns a function that lets you select one or more fields from the validation state. The hook will
 * only force a re-render if the selected fields have changed.
 */
function useDelayedSelector<U>(
  outerSelector: (state: ValidationContext) => U,
): <U2>(cacheKey: string, innerSelector: (state: U) => U2) => U2 {
  const selector = useDelayedMemoSelector();
  const callbacks = useRef<Record<string, Parameters<typeof selector>[0]>>({});

  useEffect(() => {
    callbacks.current = {};
  }, [selector]);

  return useCallback(
    (cacheKey, innerSelector) => {
      if (!callbacks.current[cacheKey]) {
        callbacks.current[cacheKey] = (state) => innerSelector(outerSelector(state));
      }
      return selector(callbacks.current[cacheKey]) as any;
    },
    // The outer selector is not expected to change, so we don't need to include it in the dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selector],
  );
}

function useDataModelSelector(): (reference: IDataModelReference) => FieldValidation[] {
  const selector = useDelayedMemoSelector();
  const callbacks = useRef<Record<string, Parameters<typeof selector>[0]>>({});

  useEffect(() => {
    callbacks.current = {};
  }, [selector]);

  return useCallback(
    (reference: IDataModelReference) => {
      const cacheKey = `${reference.dataType}/${reference.field}`;
      if (!callbacks.current[cacheKey]) {
        callbacks.current[cacheKey] = (state) => state.state.dataModels[reference.dataType]?.[reference.field];
      }
      return selector(callbacks.current[cacheKey]) as any;
    },
    [selector],
  );
}

export type ValidationSelector = ReturnType<typeof useDelayedSelector<ValidationContext>>;
export type ValidationFieldSelector = ReturnType<typeof useDelayedSelector<FieldValidations>>;
export type ValidationComponentSelector = ReturnType<typeof useDelayedSelector<ComponentValidations>>;
export type ValidationVisibilitySelector = ReturnType<typeof useDelayedSelector<Visibility>>;

export const Validation = {
  useFullStateRef: () => useSelectorAsRef((state) => state.state),

  // Selectors. These are memoized, so they won't cause a re-render unless the selected fields change.
  useSelector: () => useDelayedSelector((state) => state),
  useDataModelSelector,
  useComponentSelector: () => useDelayedSelector((state) => state.state.components),
  useVisibilitySelector: () => useDelayedSelector((state) => state.visibility),

  useOnDeleteGroupRow: () => useSelector((state) => state.removeRowVisibilityOnDelete),
  useSetAttachmentVisibility: () => useSelector((state) => state.setAttachmentVisibility),
  useSetNodeVisibility: () => useSelector((state) => state.setNodeVisibility),
  useSetShowAllErrors: () => useSelector((state) => state.setShowAllErrors),
  useValidating: () => useSelector((state) => state.validating),
  useUpdateTaskValidations: () => useLaxSelector((state) => state.updateTaskValidations),
  useUpdateComponentValidations: () => useSelector((state) => state.updateComponentValidations),
  useUpdateDataModelValidations: () => useSelector((state) => state.updateDataModelValidations),
  useUpdateBackendValidations: () => useSelector((state) => state.updateBackendValidations),

  useLaxRef: () => useLaxSelectorAsRef((state) => state),
};
