import * as React from "react";
import Summary from "./summary/summary";
import InspectorButton from "./summary/inspector-button";
import { ActiveTab, switchTab } from "../redux/index";
import { connect } from "react-redux";

const PANEL = "v-VerdantPanel-content";
const CRUMB_MENU = "v-VerdantPanel-crumbMenu";
const CRUMB_MENU_ITEM = "v-VerdantPanel-crumbMenu-item";
const HEADER = "v-VerdantPanel-tab-header";

export type CrumbBox_Props = {
  showDetail: () => void;
};

class ArtifactSummary extends React.Component<CrumbBox_Props> {
  render() {
    return (
      <div className={PANEL}>
        <div className={HEADER}>
          <div className={CRUMB_MENU}>{this.buildCrumbMenu()}</div>
          <InspectorButton />
        </div>
        <Summary />
      </div>
    );
  }

  buildCrumbMenu() {
    return (
      <div>
        <div className={CRUMB_MENU_ITEM}>Notebook</div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetail: () => {
      dispatch(switchTab(ActiveTab.Artifact_Details));
    },
  };
};

export default connect(null, mapDispatchToProps)(ArtifactSummary);
