import { VerNotebook } from "../lilgit/components/notebook";
import { Store } from "redux";
import { Contents, ContentsManager } from "@jupyterlab/services";

// TODO stream log to file

export class VerdantLog {
  private notebook: VerNotebook;
  private logStore = "";
  private logPending = [];
  private fileIO: ContentsManager;

  log(msg: string, ...msg_list: string[]) {
    let str = `${Date.now()} ${msg} ${msg_list.join(", ")}`;
    this.logPending.push(str);
  }

  async setNotebook(notebook: VerNotebook) {
    this.notebook = notebook;
    this.logStore = (await this.loadLog()) + this.logStore;
  }

  recordAction(action, store) {
    let state = store.getState();
    let record = {
      currentEvent: state.currentEvent,
      activeTab: state.activeTab,
      inspectOn: state.inspectOn,
      inspecting: state.inspectTarget,
      searchQuery: state.searchQuery,
    };
    this.log("Redux state: ", JSON.stringify(record));
    this.log("Dispatching redux action: ", JSON.stringify(action));
  }

  getReduxLogger() {
    return verLogger.bind(this, this);
  }

  getFile() {
    let name = this.notebook.name;
    name = name.substring(0, name.indexOf(".")) + ".ipylog";
    return name;
  }

  getPath() {
    let path = this.notebook.path;
    path = "/" + path.substring(0, path.lastIndexOf("/") + 1);
    return path;
  }

  loadLog() {
    return new Promise((accept) => {
      const name = this.getFile();
      const path = this.getPath() + name;
      let contents = new ContentsManager();
      contents
        .get(path)
        .then((res) => {
          accept(res.content);
        })
        .catch(() => {
          // we won't care if the file isn't found
          accept("");
        });
    });
  }

  async saveLog() {
    if (this.logPending.length > 0) {
      this.logStore += this.logPending.join("\n");
      this.logPending = [];

      // make saving thing
      if (!this.fileIO) this.fileIO = new ContentsManager();

      // make file data
      let name = this.getFile();
      let path = this.getPath() + name;
      var saveModel = new LoggerSaveModel(
        name,
        path,
        "today",
        "today",
        this.logStore
      );

      // save
      return this.fileIO.save(path, saveModel);
    }
  }
}

/* Function for redux middleware */
const verLogger = (log: VerdantLog, store: Store) => (next) => (action) => {
  log.recordAction(action, store);
  let result = next(action);
  return result;
};

class LoggerSaveModel implements Contents.IModel {
  readonly type: Contents.ContentType = "file";
  readonly writable: boolean = true;
  readonly mimetype: string = "application/json";
  readonly format: Contents.FileFormat = "text";

  readonly name: string;
  readonly path: string;
  readonly created: string;
  readonly last_modified: string;
  readonly content: any;

  constructor(
    name: string,
    path: string,
    createDate: string,
    modDate: string,
    content: any
  ) {
    this.name = name;
    this.path = path;
    this.created = createDate;
    this.last_modified = modDate;
    this.content = content;
  }
}
