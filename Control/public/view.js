/**
 * @license
 * Copyright 2019-2020 CERN and copyright holders of ALICE O2.
 * See http://alice-o2.web.cern.ch/copyright for details of the copyright holders.
 * All rights not expressly granted are reserved.
 *
 * This software is distributed under the terms of the GNU General Public
 * License v3 (GPL Version 3), copied verbatim in the file "COPYING".
 *
 * In applying this license CERN does not waive the privileges and immunities
 * granted to it by virtue of its status as an Intergovernmental Organization
 * or submit itself to any jurisdiction.
*/

// Framework
import {h, switchCase, notification} from '/js/src/index.js';

// Common app helpers
import appHeader from './common/appHeader.js';
import sidebar from './common/sidebar.js';

// Page specific views (contents and headers)
import {
  content as workflowsContent,
  header as workflowsHeader
} from './workflow/workflowsPage.js';
import {
  content as environmentsContent,
  header as environmentsHeader
} from './environment/environmentsPage.js';
import {
  content as environmentContent,
  header as environmentHeader
} from './environment/environmentPage.js';
import {
  content as statusContent,
  header as statusHeader
} from './frameworkinfo/frameworkInfoPage.js';
import {
  content as configurationContent,
  header as configurationHeader
} from './configuration/configPage.js';
import {
  content as taskContent,
  header as taskHeader
} from './task/taskPage.js';

/**
 * Main view layout
 * @param {object} model - representing current application state
 * @return {vnode} application view to be drawn according to model
 */
export default (model) => [
  notification(model.notification),
  h('.flex-column absolute-fill', [
    header(model),
    h('.flex-grow flex-row', [
      h('.sidebar.sidebar-content.relative', {
        class: model.sideBarMenu ? '' : 'sidebar-minimal'
      }, sidebar(model)
      ),
      h('.flex-grow.relative', [
        content(model)
      ])
    ]),
  ])
];

/**
 * Top header with app menu on the left and page menu for the rest
 * @param {object} model
 * @return {vnode}
 */
const header = (model) => h('.bg-white flex-row p2 shadow-level2 level2', [
  appHeader(model),
  switchCase(model.router.params.page, {
    newEnvironment: workflowsHeader,
    environments: environmentsHeader,
    environment: environmentHeader,
    about: statusHeader,
    configuration: configurationHeader,
    taskList: taskHeader
  })(model)
]);

/**
 * Page content depending on the query string handler by router model
 * @param {object} model
 * @return {vnode}
 */
const content = (model) => [
  switchCase(model.router.params.page, {
    newEnvironment: workflowsContent,
    environments: environmentsContent,
    environment: environmentContent,
    about: statusContent,
    configuration: configurationContent,
    taskList: taskContent
  })(model)
];
