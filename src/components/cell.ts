import {
  NodeyCell,
  NodeyOutput,
  NodeyMarkdown,
  NodeyCodeCell
} from "../model/nodey";
import { PromiseDelegate } from "@phosphor/coreutils";
import { OutputArea } from "@jupyterlab/outputarea";
import { VerNotebook } from "./notebook";
import { Checkpoint } from "../model/checkpoint";
import { NodeyFactory } from "../model/nodey-factory";
import { Cell, CodeCell, MarkdownCell } from "@jupyterlab/cells";

export class VerCell {
  constructor(
    notebook: VerNotebook,
    cell: Cell,
    index: number,
    matchPrior: boolean
  ) {
    this.notebook = notebook;
    this.position = index;
    this.view = cell;
    this.init(matchPrior);
  }

  private position: number;
  readonly view: Cell;
  private modelName: string;
  private readonly notebook: VerNotebook;

  private async init(matchPrior: boolean) {
    if (this.view instanceof CodeCell) await this.initCodeCell(matchPrior);
    else if (this.view instanceof MarkdownCell)
      await this.initMarkdownCell(matchPrior);
    this._ready.resolve(undefined);
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  get model(): NodeyCell {
    return this.notebook.history.store.getLatestOf(this.modelName) as NodeyCell;
  }

  get output(): NodeyOutput[] {
    var output = (this.model as NodeyCodeCell).output;
    if (output)
      return output.map(o => {
        return this.notebook.history.store.get(o) as NodeyOutput;
      });
  }

  public get outputArea(): OutputArea {
    if (this.view instanceof CodeCell)
      return (this.view as CodeCell).outputArea;
  }

  public async repair() {
    let text: string = "";
    // check cell wasn't just deleted
    if (this.view.inputArea) text = this.view.editor.model.value.text;
    await this.notebook.ast.repairFullAST(this.model, text);
    console.log("Repaired cell", this.model);
  }

  public async repairAndCommit(checkpoint: Checkpoint): Promise<NodeyCell> {
    // repair the cell against the prior version
    await this.repair();
    let nodey = this.model;

    // commit the cell if it has changed
    let newNodey = this.notebook.history.stage.commit(checkpoint, nodey);
    console.log("Cell committed", newNodey);
    return newNodey;
  }

  public async added() {
    //TODO
  }

  public async deleted() {
    //TODO
  }

  public async cellTypeChanged() {
    //TODO
  }

  private async initCodeCell(matchPrior: boolean) {
    var cell = this.view as CodeCell;
    var text: string = cell.editor.model.value.text;
    if (matchPrior) {
      let name = this.notebook.cells[this.position].model.name;
      var nodeyCell = this.notebook.history.store.get(name);
      if (nodeyCell instanceof NodeyCodeCell) {
        let nodey = await this.notebook.ast.matchASTOnInit(nodeyCell, text);
        this.modelName = nodey.name;
        //TODO match output too
      } else if (nodeyCell instanceof NodeyMarkdown) {
        var output = NodeyFactory.outputToNodey(
          cell,
          this.notebook.history.store
        );
        let nodey = await this.notebook.ast.markdownToCodeNodey(
          nodeyCell,
          text,
          this.position
        );
        if (!nodey.output) nodey.output = [];
        nodey.output = nodey.output.concat(output);
        this.modelName = nodey.name;
      }
    } else {
      var output = NodeyFactory.outputToNodey(
        cell,
        this.notebook.history.store
      );
      let nodey = await this.notebook.ast.generateCodeNodey(
        text,
        this.position
      );
      if (!nodey.output) nodey.output = [];
      nodey.output = nodey.output.concat(output);
      this.modelName = nodey.name;
      console.log("created Output!", output, nodey);
    }
  }

  private async initMarkdownCell(matchPrior: boolean) {
    if (matchPrior) {
      let name = this.notebook.cells[this.position].model.name; //TODO could easily fail!!!
      var nodeyCell = this.notebook.history.store.get(name);
      //console.log("Prior match is", nodeyCell, this.position);
      if (nodeyCell instanceof NodeyMarkdown) {
        this.modelName = nodeyCell.name;
        await this.notebook.ast.repairMarkdown(
          nodeyCell,
          this.view.model.value.text
        );
      } else if (nodeyCell instanceof NodeyCodeCell) {
        var nodey = await NodeyFactory.dictToMarkdownNodey(
          this.view.model.value.text,
          this.position,
          this.notebook.history.store,
          nodeyCell.name
        );
      }
    } else {
      var nodey = await NodeyFactory.dictToMarkdownNodey(
        this.view.model.value.text,
        this.position,
        this.notebook.history.store
      );
    }
    this.modelName = nodey.name;
  }

  private _ready = new PromiseDelegate<void>();
}
