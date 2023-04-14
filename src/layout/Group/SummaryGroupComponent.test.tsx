import React from 'react';

import configureStore from 'redux-mock-store';

import { getFormDataStateMock } from 'src/__mocks__/formDataStateMock';
import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
import { renderWithProviders } from 'src/testUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

describe('SummaryGroupComponent', () => {
  let mockHandleDataChange: () => void;
  let mockStore;

  beforeAll(() => {
    const createStore = configureStore();
    const formLayout = getFormLayoutStateMock({
      layouts: {
        page1: [
          {
            type: 'Group',
            id: 'groupComponent',
            dataModelBindings: {
              group: 'mockGroup',
            },
            textResourceBindings: {
              title: 'mockGroupTitle',
            },
            children: ['0:mockId1', '1:mockId2'],
            edit: {
              multiPage: true,
            },
            maxCount: 3,
          },
          {
            type: 'Input',
            id: 'mockId1',
            dataModelBindings: {
              simpleBinding: 'mockGroup.mockDataBinding1',
            },
            readOnly: false,
            required: false,
            disabled: false,
            textResourceBindings: {
              title: 'mockField1',
            },
            triggers: [],
          },
          {
            type: 'Input',
            id: 'mockId2',
            dataModelBindings: {
              simpleBinding: 'mockGroup.mockDataBinding2',
            },
            readOnly: false,
            required: false,
            disabled: false,
            textResourceBindings: {
              title: 'mockField2',
            },
            triggers: [],
          },
          {
            type: 'Summary',
            id: 'mySummary',
            pageRef: 'page1',
            componentRef: 'groupComponent',
            largeGroup: false,
          },
        ],
      },
      uiConfig: {
        autoSave: true,
        focus: null,
        hiddenFields: [],
        repeatingGroups: {
          groupComponent: {
            index: 0,
            dataModelBinding: 'mockGroup',
          },
        },
        currentView: 'FormLayout',
        navigationConfig: {},
        tracks: {
          order: [],
          hidden: [],
          hiddenExpr: {},
        },
        excludePageFromPdf: [],
        excludeComponentFromPdf: [],
      },
    });

    const formData = getFormDataStateMock({
      formData: {
        'mockGroup[0].mockDataBinding1': '1',
        'mockGroup[0].mockDataBinding2': '2',
      },
    });

    const initialState: any = getInitialStateMock({
      formData,
      formLayout,
      textResources: {
        error: null,
        language: 'nb',
        resources: [
          {
            id: 'mockGroupTitle',
            value: 'Mock group',
          },
          {
            id: 'mockField1',
            value: 'Mock field 1',
          },
          {
            id: 'mockField2',
            value: 'Mock field 2',
          },
        ],
      },
    });
    mockStore = createStore(initialState);
  });

  beforeEach(() => {
    mockHandleDataChange = jest.fn();
  });

  test('SummaryGroupComponent -- should match snapshot', () => {
    const { asFragment } = renderSummaryGroupComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  function renderSummaryGroupComponent() {
    function Wrapper() {
      const summaryNode = useResolvedNode('mySummary') as LayoutNodeFromType<'Summary'>;
      const groupNode = useResolvedNode('groupComponent') as LayoutNodeFromType<'Group'>;

      return (
        <SummaryGroupComponent
          changeText={'Change'}
          onChangeClick={mockHandleDataChange}
          summaryNode={summaryNode}
          targetNode={groupNode}
        />
      );
    }

    return renderWithProviders(<Wrapper />, { store: mockStore });
  }
});