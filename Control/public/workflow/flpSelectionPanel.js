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

import {h} from '/js/src/index.js';
import pageLoading from '../common/pageLoading.js';

/**
 * Create a selection area for all FLPs from consul
 * @param {Object} workflow
 * @return {vnode}
 */
export default (workflow) => [
  h('.w-100.flex-row.panel-title', [
    h('.form-check', {style: 'width: 2%'},
      h('input.form-check-input', {
        type: 'checkbox',
        title: 'Toggle selection of ALL FLPs',
        style: 'margin-top: 1em; margin-left: 0em;',
        checked: workflow.areAllFLPsSelected(),
        onchange: () => workflow.toggleAllFLPSelection(name)
      }),
    ),
    h('h5.bg-gray-light.p2', {style: 'width: 98%'},
      `FLP Selection (${workflow.form.hosts.length} out of ${workflow.flpList.payload.length} selected)`),
  ]),
  h('.w-100.p2.panel',
    workflow.flpList.match({
      NotAsked: () => null,
      Loading: () => pageLoading(2),
      Success: (list) => flpSelectionArea(list, workflow),
      Failure: (error) => h('.f7.flex-column', [
        error.includes(404) ?
          h('', error)
          :
          h('', [
            h('', 'FLP Selection is currently disabled due to connection refused to Consul.'),
            h('', ' Please use `Advanced Configuration` panel to select your FLP Hosts')
          ])
      ]),
    })
  )];

/**
 * Display an area with selectable elements
 * @param {Array<string>} list
 * @param {Object} workflow
 * @return {vnode}
 */
const flpSelectionArea = (list, workflow) =>
  h('.w-100.m1.text-left.shadow-level1.scroll-y.flex-column', {
    style: 'max-height: 25em;'
  }, [
    list.map((name) =>
      h('.form-check.flex-row.check-item', [
        h('input.form-check-input', {
          type: 'checkbox',
          style: 'margin-top: .7em; margin-left: -.7em;',
          id: name,
          checked: workflow.form.hosts.indexOf(name) >= 0 ? true : false,
          onchange: () => workflow.toggleFLPSelection(name)
        }),
        h('label.form-check-label.ph2', {
          for: name,
          style: 'cursor: pointer;'
        }, name)
      ])
    ),
  ]);
