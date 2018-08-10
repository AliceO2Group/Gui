/* global: JSROOT */

import {Observable, fetchClient, WebSocketClient, RemoteData} from '/js/src/index.js';

import ObjectTree from './ObjectTree.class.js'

export default class Object_ extends Observable {
  constructor(model) {
    super();

    this.model = model;

    this.list = null;
    this.tree = null; // ObjectTree
    this.selected = null; // object - id of object
    this.objects = {}; // objectName -> RemoteData
    this.objectsReferences = {}; // object name -> number of
    this.informationService = null; // null or {...}, null means not loaded yet
    this.listOnline = []; // intersection of informationService and list
    this.onlineMode = false; // show only online objects or all (offline)
    this.onlineModeAvailable = false; // true if data are coming from server

    this.searchInput = ''; // string - content of input search
    this.searchResult = []; // array - result list of search

    this.refreshTimer = 0;
    this.refreshInterval = 0; // seconds
    this.setRefreshInterval(60);
  }

  /**
   * Go between online and ffline moe
   */
  toggleMode() {
    this.onlineMode = !this.onlineMode;
    this._computeFilters();
    this.notify();
  }

  /**
   * Set IS data
   * {DAQ01/EquipmentSize/ACORDE/ACORDE: {}, DAQ01/EquipmentSize/ITSSDD/ITSSDD: {},…}
   * @param {Map<path:string, object>} informationService
   */
  setInformationService(informationService) {
    this.informationService = informationService;
    this.onlineModeAvailable = true;
    this._computeFilters();
    this.notify();
  }

  _computeFilters() {
    if (this.onlineMode && this.tree && this.informationService) {
      this.tree.clearAllIS();
      this.tree.updateAllIS(this.informationService);
    }

    if (this.onlineMode && this.list && this.informationService) {
      this.listOnline = this.list.filter((item) => this.informationService[item.name]);
    }

    if (this.searchInput) {
      const listSource = (this.onlineMode ? this.listOnline : this.list) || []; // with fallback
      const fuzzyRegex = new RegExp(this.searchInput.split('').join('.*?'), 'i');
      this.searchResult = listSource.filter(item => {
        return item.name.match(fuzzyRegex);
      });
    }
  }

  async loadList() {
    const req = fetchClient(`/api/listObjects`, {method: 'GET'});
    this.model.loader.watchPromise(req);
    const res = await req;
    const list = await res.json();

    if (!this.tree) {
      this.tree = new ObjectTree('database');
      this.tree.bubbleTo(this);
    }

    this.tree.addChildrens(list);
    this.list = list;
    this._computeFilters();
    this.notify();
  }

  /**
   * Load full content of an object in-memory, do nothing if already in.
   * Also adds a reference to this object.
   * @param {string} objectName - e.g. /FULL/OBJECT/PATH
   * @return {Promise}
   */
  async loadObject(objectName) {
    if (!this.objectsReferences[objectName]) {
      this.objectsReferences[objectName] = 1;
    } else {
      this.objectsReferences[objectName]++;
      return;
    }

    // we don't put a RemoteData.Loading() state to avoid blinking between 2 loads

    const {result, ok, status} = await this.model.loader.get(`/api/readObjectData?objectName=${objectName}`);
    if (ok) {
      // link JSROOT methods to object
      this.objects[objectName] = RemoteData.Success(JSROOT.JSONR_unref(result));
    } else if (status === 404) {
      this.objects[objectName] = RemoteData.Failure('Object not found');
    } else {
      this.objects[objectName] = RemoteData.Failure(result.error);
    }

    this.notify();
  }

  /**
   * Reload currently used objects which have a number of references greater or equal to 1
   */
  async loadObjects(objectsNames) {
    if (!objectsNames || !objectsNames.length) {
      return;
    }

    const {result, ok, status} = await this.model.loader.post(`/api/readObjectsData`, {objectsNames});
    if (!ok) {
      // it should be always status=200 for this request
      alert('Failed to refresh plots when contacting server');
      return;
    }

    const objects = JSROOT.JSONR_unref(result);
    for (let name in objects) {
      if (objects[name].error) {
        this.objects[name] = RemoteData.Failure(objects[name].error);
      } else {
        this.objects[name] = RemoteData.Success(objects[name]);
      }
    }

    this.notify();
  }

  /**
   * Removes a reference to the specified object and unload it from memory if not used anymore
   * @param {string} objectName - The object name like /FULL/OBJ/NAME
   */
  unloadObject(objectName) {
    this.objectsReferences[objectName]--;

    // No more used
    if (!this.objectsReferences[objectName]) {
      delete this.objects[objectName];
      delete this.objectsReferences[objectName];
    }

    this.notify();
  }

  /**
   * Indicate that the object loaded is wrong. Used after trying to print it with jsroot
   * @param {string} name - name of the object
   */
  invalidObject(name) {
    this.objects[name] = RemoteData.Failure('JSROOT was unable to draw this object');
    this.notify();
  }

  setRefreshInterval(intervalSeconds) {
    // Stop any other timer
    clearTimeout(this.refreshTimer);

    // Validate user input
    let parsedValue = parseInt(intervalSeconds, 10);
    if (isNaN(parsedValue) || parsedValue < 1) {
      parsedValue = 2;
    }

    // Start new timer
    this.refreshInterval = intervalSeconds;
    this.refreshTimer = setTimeout(() => {this.setRefreshInterval(this.refreshInterval);}, this.refreshInterval * 1000);
    this.notify();

    // Refreshed currently seen objects
    this.loadObjects(Object.keys(this.objects));

    // refreshTimer is a timer id (number) and is also used in the view to
    // interpret new cycle when this number changes
  }

  select(object) {
    this.selected = object;
    this.notify();
  }

  search(searchInput) {
    this.searchInput = searchInput;
    this._computeFilters();
    this.notify();
  }
}
