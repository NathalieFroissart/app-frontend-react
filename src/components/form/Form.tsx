import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';

import classes from 'src/components/form/Form.module.css';
import { MessageBanner } from 'src/components/form/MessageBanner';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useExpandedWidthLayouts } from 'src/features/form/layout/LayoutsContext';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FrontendValidationSource } from 'src/features/validation';
import { useTaskErrors } from 'src/features/validation/selectors/taskErrors';
import { useCurrentView, useNavigatePage } from 'src/hooks/useNavigatePage';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { extractBottomButtons, hasRequiredFields } from 'src/utils/formLayout';
import { useNodesMemoSelector } from 'src/utils/layout/NodesContext';

export function Form() {
  const currentPageId = useCurrentView();
  const { isValidPageId, navigateToPage } = useNavigatePage();
  const topLevelNodeIds = useNodesMemoSelector(
    (nodes) =>
      nodes
        .findLayout(currentPageId)
        ?.children()
        .map((n) => n.item.id),
  );
  const hasRequired = useNodesMemoSelector((nodes) => {
    const page = nodes.findLayout(currentPageId);
    return page ? hasRequiredFields(page) : false;
  });

  useRedirectToStoredPage();
  useSetExpandedWidth();

  useRegisterNodeNavigationHandler((targetNode) => {
    const targetView = targetNode?.top.top.myKey;
    if (targetView && targetView !== currentPageId) {
      navigateToPage(targetView, { shouldFocusComponent: true });
      return true;
    }
    return false;
  });

  const { formErrors, taskErrors } = useTaskErrors();
  const hasErrors = Boolean(formErrors.length) || Boolean(taskErrors.length);
  const [mainIds, errorReportIds] = useNodesMemoSelector((nodes) => {
    const page = nodes.findLayout(currentPageId);
    if (!hasErrors || !page) {
      return [topLevelNodeIds, []];
    }
    return extractBottomButtons(page);
  });
  const requiredFieldsMissing = formErrors.some(
    (error) => error.source === FrontendValidationSource.EmptyField && error.pageKey === currentPageId,
  );

  if (!currentPageId || !isValidPageId(currentPageId)) {
    return <FormFirstPage />;
  }

  return (
    <>
      {hasRequired && (
        <MessageBanner
          error={requiredFieldsMissing}
          messageKey={'form_filler.required_description'}
        />
      )}
      <Grid
        container={true}
        spacing={3}
        alignItems='flex-start'
      >
        {mainIds?.map((id) => (
          <GenericComponentById
            key={id}
            id={id}
          />
        ))}
        <Grid
          item={true}
          xs={12}
          aria-live='polite'
          className={classes.errorReport}
        >
          <ErrorReport renderIds={errorReportIds} />
        </Grid>
      </Grid>
      <ReadyForPrint />
    </>
  );
}

export function FormFirstPage() {
  const { startUrl, queryKeys } = useNavigatePage();
  return (
    <Navigate
      to={startUrl + queryKeys}
      replace
    />
  );
}

/**
 * Redirects users that had a stored page in their local storage to the correct
 * page, and later removes this currentViewCacheKey from localstorage, as
 * it is no longer needed.
 */
function useRedirectToStoredPage() {
  const { currentPageId, partyId, instanceGuid, isValidPageId, navigateToPage } = useNavigatePage();
  const applicationMetadataId = useApplicationMetadata()?.id;
  const location = useLocation().pathname;

  const instanceId = `${partyId}/${instanceGuid}`;
  const currentViewCacheKey = instanceId || applicationMetadataId;

  useEffect(() => {
    if (!currentPageId && !!currentViewCacheKey) {
      const lastVisitedPage = localStorage.getItem(currentViewCacheKey);
      if (lastVisitedPage !== null && isValidPageId(lastVisitedPage)) {
        localStorage.removeItem(currentViewCacheKey);
        navigateToPage(lastVisitedPage, { replace: true });
      }
    }
  }, [currentPageId, currentViewCacheKey, isValidPageId, location, navigateToPage]);
}

/**
 * Sets the expanded width for the current page if it is defined in the currently viewed layout-page
 */
function useSetExpandedWidth() {
  const currentPageId = useCurrentView();
  const expandedPagesFromLayout = useExpandedWidthLayouts();
  const expandedWidthFromSettings = usePageSettings().expandedWidth;
  const { setExpandedWidth } = useUiConfigContext();

  useEffect(() => {
    let defaultExpandedWidth = false;
    if (currentPageId && expandedPagesFromLayout[currentPageId] !== undefined) {
      defaultExpandedWidth = !!expandedPagesFromLayout[currentPageId];
    } else if (expandedWidthFromSettings !== undefined) {
      defaultExpandedWidth = expandedWidthFromSettings;
    }
    setExpandedWidth(defaultExpandedWidth);
  }, [currentPageId, expandedPagesFromLayout, expandedWidthFromSettings, setExpandedWidth]);
}
