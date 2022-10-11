import type { FC, ReactElement } from "react";
import { useContext } from "react";
import { FlexibleTab } from "./FlexibleTab";
import { LayoutContext } from "./LayoutContext";
import style from "./FlexibleTabsContainer.modules.scss";

import dragIcon from "../../imgs/dragDotsIcon_white.svg";
import { getPosInLayout } from "./unitTools";
import { DraggableIcon } from "./DraggableIcon";
import { ElementTypes } from "./types";

export interface IFlexibleTabsContainerProps {
    tabs: { component: ReactElement; id: string }[];
    rowIndex: number;
    columnIndex: number;
    selectedTab?: string;
}

export const FlexibleTabsContainer: FC<IFlexibleTabsContainerProps> = (props) => {
    const { layout, setLayout } = useContext(LayoutContext);
    const { tabs, selectedTab } = props;
    const selectedTabId = props.selectedTab !== undefined ? props.selectedTab : tabs[0].id;
    const selectedTabArray = tabs.filter((tab) => tab.id === selectedTabId);
    const selectedTabObject = selectedTabArray.length > 0 ? selectedTabArray[0] : null;

    const selectTab = (tabId: string) => {
        console.log("select tab with tabid", tabId, "rowindex", props.rowIndex, "colidx", props.columnIndex);
        const layoutPos = getPosInLayout(layout, props.columnIndex, props.rowIndex);
        console.log("layoutpos", layoutPos);
        layoutPos.selectedTab = tabId;
        setLayout({ ...layout });
    };

    const addTabAfter = (droppedTabItem: any, dropZoneTabId: string) => {
        // Get layout element corresponding to dropped tabs
        const layoutDropped = getPosInLayout(layout, droppedTabItem.columnNumber, droppedTabItem.rowNumber);
        // Get layout element corresponding to dropzone
        const layoutDropZone = getPosInLayout(layout, props.columnIndex, props.rowIndex);

        for (const { id } of droppedTabItem.tabs) {
            const droppedTabIndex = layoutDropped.tabs.findIndex((tab: any) => tab.id === id);
            const droppedTab = layoutDropped.tabs[droppedTabIndex];
            // Add dropped tab after dropZoneTabId
            const dropZoneIndex = layoutDropZone.tabs.findIndex((tab: any) => tab.id === dropZoneTabId);
            layoutDropZone.tabs.splice(dropZoneIndex + 1, 0, droppedTab);
            // Remove dropped tab from its original position
            layoutDropped.tabs.splice(droppedTabIndex, 1);
        }

        // Update layout
        setLayout({ ...layout });
    };

    return (
        <div className={style.rootContainer}>
            <div draggable={false} className={style.tabsLineContainer}>
                <div className={style.tabsContainer}>
                    {tabs.map((tab) => {
                        return (
                            <FlexibleTab
                                key={tab.id}
                                title={tab.id}
                                selected={tab.id === selectedTab}
                                onClick={() => selectTab(tab.id)}
                                item={{ rowNumber: props.rowIndex, columnNumber: props.columnIndex, tabs: [{ id: tab.id }] }}
                                onTabDroppedAction={(item) => addTabAfter(item, tab.id)}
                            />
                        );
                    })}
                </div>
                {/* <img className={style.dragIcon} src={dragIcon} /> */}
                <DraggableIcon
                    src={dragIcon}
                    item={{ rowNumber: props.rowIndex, columnNumber: props.columnIndex, tabs: tabs.map((t) => ({ id: t.id })) }}
                    type={ElementTypes.TAB_GROUP}
                />
            </div>
            <div className={style.contentContainer}>{selectedTabObject?.component}</div>
        </div>
    );
};
