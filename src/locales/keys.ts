// Written by tools/build_locales.mjs from the tables of phrases; do not edit by hand (run `npm run locales`).

/** The sections of the Help, in order. */
export const HELP_SECTION_IDS: readonly string[] = ["start","overview","weather","alarms","alarmPanels","cameras","radar","record","history","inverters","batteries","electrical","devices","automations","network","siteDesigner","alarmDesigner","electricalDesigner","networkDesigner","system","services","configuration","tips"];

/** The keys of the hover hints (the text of each is the phrase of the same key under HINT_PREFIX in the language tables). */
export const HINT_PREFIX = "hint~";
export const HINT_KEYS: readonly string[] = ["nav:overview","nav:weather","nav:alarms","nav:alarmPanels","nav:cameras","nav:radar","nav:inverters","nav:batteries","nav:electrical","nav:network","nav:devices","nav:automations","nav:record","nav:history","nav:siteDesigner","nav:electricalDesigner","nav:networkDesigner","nav:system","nav:services","nav:configuration","collapse","expand","helpButton","about","fullscreen","exitFullscreen","armSystem","disarmSystem","signOut","language","theme","acknowledge","acknowledgeAll","alarmDetails","alarmHideDetails","alarmMarkKnown","alarmDeleteTitle","clearRecord","alarmFilterSeverity","alarmFilterSource","alarmSearch","cam_configure","cam_wall","cam_back","cam_back_grid","maximizeCamera","nextCamera","previousCamera","snapshot","record","stopRecording","ptzControls","ptzShow","ptzHide","newCamera","editCamera","saveCamera","deleteCamera","cameraUser","cameraPassword","hostAddress","rtspPort","rtspPath","onvifPort","snapshotUrl","discoverRtsp","deleteMedia","deleteAllMedia","deleteNow","cancel","close","duplicate","undo","redo","searchPlaceholder","clearFilters","returnConsole","openMonitor","openDesigner","openHistory","addDevice","editDevice","saveDevice","deviceKind","deviceLocation","deviceName","deviceConnection","deviceProtocol","expectedInterval","assumeState","searchDevices","placeOnDesign","removeFromDesign","testTrigger","testClear","newAutomation","editAutomation","saveAutomation","runNow","addAction","removeAction","dwellSeconds","net_search","net_all_kinds","net_only_offline","net_only_unknown","net_trusted","net_notes","net_kind_own","net_save","net_forget","net_events","net_outages","net_probes","no_ping","no_traceroute","no_wake","no_watch","no_unwatch","no_hide","no_unhide","no_hidden_show","no_look_page","no_inspect","no_inspect_login","no_login_keep","no_login_forget","no_rescan_ports","no_scan_now","no_copy","forgetNode","nodeFinderScan","nodeFinderUse","solarAddInverter","solarAddBattery","solarExampleButton","solarNode","solarIdentifier","solarConnection","solarHistory","solarDelete","solarEditDevice","levelFilter","rangeFilter","rangeFrom","rangeTo","newestFirst","oldestFirst","loadMore","clearHistory","liveHelp","auditFilter","auditOnlyProblems","svcRefresh","svcSearch","svcActive","svcInactive","wxSearch","wxUseCoordinates","wxChangePlace","wxDisable","wxRadarPlay","wxRadarPause","wxRadarCenter","wxRadarOpacity","tabGeneral","tabCameras","tabDiscovery","tabVideo","tabUsers","tabSecurity","savePreferences","saveUi","serverOrigin","oc_check","oc_use","cs_save","addUser","createUser","userName","role","myAccount","saveAccount","currentPassword","newPassword","confirmPassword","view2d","view3d","zoomIn","zoomOut","fitView","gridToggle","snapToggle","dimensionsToggle","roofLinesToggle","roofHidden","addFloor","removeFloor","floorSelector","layers","deleteObject","deleteBuilding","addCornerButton","addCornerAfter","deleteCorner","redrawTerrain","templates","exportSite","exportFirst","versionsButton","versionsRestore","addRadar","deleteSensor","sensorNode","sensorModel","sensorMirror","addZone","removeZone","addNode270","node270Create","elNew","elPresetHouse","elToolSelect","elToolWire","elToolFrame","elExportJson","elExportSvg","elImport","elFit","elWireSection","elWireLength","elBindNode","elBindSolar","nd_tool_link","nd_rotate","nd_replace","nd_speed","nd_vlan","nd_draw_found","nd_example","nd_cam_link","nd_bind_device","powerOn","powerOff","cmdToggle","commandTopic","stateTopic","availabilityTopic","mappingLabel","urlOn","urlOff","urlToggle","whenLabel","thenLabel","becomes","andModeLabel","modeAny","modeOnlyArmed","modeOnlyDisarmed","forSeconds","sourceCamera","sourceDevice","sourceNode","anySource","anySeverity","saveRules","retryAction","deleteOlderScope","deleteAllScope","allMedia","snapshots","recordings","keepPassword","no_login_user","no_login_password","presetHost","presetName","ignoreZonesOf","roofStyle","featureStyle","floorHeight","objectElevation","terraceFloor","wallSide","side","north","openingArch","openingBalcony","solarModelLabel","solarCells","wxByCoordinates","wxLatitude","wxLongitude","wxPlaceName","wxRadarClouds","wxRadarRain","liveMap","orderHelp","needsAttention","quickActions","qaAddDevice","qaCameras","qaDesigner","recentActivity","sysStorage","sysMqtt","sysVideo","sysWebhook","tabServices","tabBroker","tabFiles","adm_start","adm_stop","adm_restart","adm_save","adm_save_restart","adm_revert","adm_role","adm_name","adm_add_account","adm_remove","tabFirmware","fw_ask","fw_select_kind","fw_select_none","fw_check_release","fw_start","adm_adopt","adm_adopt_go","adm_adopt_user","adm_adopt_password","adm_adopt_broker","pre_check","mediaProof","th_value"];

/** Where each detailed step of a menu tour points, by menu: the part of the page it lights up and the side its card goes. */
export type StepLayout = { target?: string; placement?: "right" | "left" | "top" | "bottom" };
export const MENU_STEP_LAYOUT: Readonly<Record<string, readonly StepLayout[]>> = {
 "overview": [
  {
   "target": "ov-mode",
   "placement": "bottom"
  },
  {
   "target": "ov-tiles",
   "placement": "bottom"
  },
  {
   "target": "ov-map",
   "placement": "right"
  },
  {
   "target": "ov-side",
   "placement": "left"
  },
  {
   "target": "ov-feed",
   "placement": "top"
  }
 ],
 "weather": [
  {
   "target": "wx-consent",
   "placement": "bottom"
  },
  {
   "target": "wx-bar",
   "placement": "bottom"
  },
  {
   "target": "wx-hero",
   "placement": "bottom"
  },
  {
   "target": "wx-radar",
   "placement": "top"
  }
 ],
 "alarms": [
  {
   "target": "al-actions",
   "placement": "bottom"
  },
  {
   "target": "al-toolbar",
   "placement": "bottom"
  },
  {
   "target": "al-list",
   "placement": "top"
  },
  {
   "target": "al-record",
   "placement": "top"
  },
  {
   "target": "stage",
   "placement": "left"
  }
 ],
 "alarmPanels": [
  {
   "target": "ap-head",
   "placement": "bottom"
  },
  {
   "target": "ap-card",
   "placement": "left"
  },
  {
   "target": "ap-modes",
   "placement": "bottom"
  },
  {
   "target": "ap-zigbee",
   "placement": "bottom"
  },
  {
   "target": "ap-actions",
   "placement": "top"
  }
 ],
 "cameras": [
  {
   "target": "cam-grid",
   "placement": "bottom"
  },
  {
   "target": "cam-frame",
   "placement": "top"
  },
  {
   "target": "cam-workspace",
   "placement": "left"
  },
  {
   "target": "cam-grid",
   "placement": "bottom"
  }
 ],
 "radar": [
  {
   "target": "radar-map",
   "placement": "right"
  },
  {
   "target": "radar-controls",
   "placement": "left"
  },
  {
   "target": "radar-side",
   "placement": "left"
  },
  {
   "target": "radar-sensors",
   "placement": "left"
  },
  {
   "target": "radar-sensors",
   "placement": "left"
  }
 ],
 "record": [
  {
   "target": "rec-filters",
   "placement": "bottom"
  },
  {
   "target": "rec-list",
   "placement": "right"
  },
  {
   "target": "rec-preview",
   "placement": "left"
  },
  {
   "target": "rec-status",
   "placement": "bottom"
  }
 ],
 "history": [
  {
   "target": "his-tabs",
   "placement": "bottom"
  },
  {
   "target": "his-stats",
   "placement": "bottom"
  },
  {
   "target": "his-filters",
   "placement": "bottom"
  },
  {
   "target": "his-actions",
   "placement": "bottom"
  }
 ],
 "inverters": [
  {
   "target": "inv-head",
   "placement": "bottom"
  },
  {
   "target": "inv-flow",
   "placement": "bottom"
  },
  {
   "target": "inv-gauges",
   "placement": "top"
  },
  {
   "target": "inv-history",
   "placement": "top"
  }
 ],
 "batteries": [
  {
   "target": "bat-head",
   "placement": "bottom"
  },
  {
   "target": "bat-stack",
   "placement": "bottom"
  },
  {
   "target": "bat-stack",
   "placement": "top"
  },
  {
   "target": "bat-history",
   "placement": "top"
  }
 ],
 "electrical": [
  {
   "target": "el-head",
   "placement": "bottom"
  },
  {
   "target": "el-channels",
   "placement": "top"
  },
  {
   "target": "el-energy",
   "placement": "top"
  },
  {
   "target": "el-devices",
   "placement": "top"
  }
 ],
 "devices": [
  {
   "target": "dev-head",
   "placement": "bottom"
  },
  {
   "target": "dev-filters",
   "placement": "bottom"
  },
  {
   "target": "dev-grid",
   "placement": "top"
  },
  {
   "target": "dev-head",
   "placement": "bottom"
  }
 ],
 "automations": [
  {
   "target": "auto-head",
   "placement": "bottom"
  },
  {
   "target": "auto-form",
   "placement": "left"
  },
  {
   "target": "auto-form",
   "placement": "left"
  },
  {
   "target": "auto-list",
   "placement": "top"
  }
 ],
 "network": [
  {
   "target": "net-hero",
   "placement": "bottom"
  },
  {
   "target": "net-public",
   "placement": "bottom"
  },
  {
   "target": "net-toolbar",
   "placement": "bottom"
  },
  {
   "target": "net-filters",
   "placement": "bottom"
  },
  {
   "target": "net-table",
   "placement": "top"
  }
 ],
 "siteDesigner": [
  {
   "target": "sd-view",
   "placement": "bottom"
  },
  {
   "target": "sd-canvas",
   "placement": "left"
  },
  {
   "target": "sd-canvas",
   "placement": "left"
  },
  {
   "target": "sd-inspector",
   "placement": "left"
  },
  {
   "target": "sd-actions",
   "placement": "bottom"
  }
 ],
 "alarmDesigner": [
  {
   "target": "ad-palette",
   "placement": "right"
  },
  {
   "target": "ad-canvas",
   "placement": "left"
  },
  {
   "target": "ad-toolbar",
   "placement": "bottom"
  },
  {
   "target": "ad-side",
   "placement": "left"
  }
 ],
 "electricalDesigner": [
  {
   "target": "ed-palette",
   "placement": "right"
  },
  {
   "target": "ed-canvas",
   "placement": "left"
  },
  {
   "target": "ed-side",
   "placement": "left"
  },
  {
   "target": "ed-toolbar",
   "placement": "bottom"
  }
 ],
 "networkDesigner": [
  {
   "target": "nd-palette",
   "placement": "right"
  },
  {
   "target": "nd-canvas",
   "placement": "left"
  },
  {
   "target": "nd-toolbar",
   "placement": "bottom"
  }
 ],
 "system": [
  {
   "target": "sys-machine",
   "placement": "bottom"
  },
  {
   "target": "sys-grid",
   "placement": "bottom"
  },
  {
   "target": "sys-health",
   "placement": "top"
  },
  {
   "target": "sys-health-control",
   "placement": "bottom"
  },
  {
   "target": "sys-nodes",
   "placement": "top"
  },
  {
   "target": "sys-audit",
   "placement": "top"
  }
 ],
 "services": [
  {
   "target": "svc-stats",
   "placement": "bottom"
  },
  {
   "target": "svc-filters",
   "placement": "bottom"
  },
  {
   "target": "svc-grid",
   "placement": "top"
  }
 ],
 "configuration": [
  {
   "target": "config-tabs",
   "placement": "bottom"
  },
  {
   "target": "tab-general",
   "placement": "bottom"
  },
  {
   "target": "tab-preferences",
   "placement": "bottom"
  },
  {
   "target": "tab-users",
   "placement": "bottom"
  },
  {
   "target": "tab-security",
   "placement": "bottom"
  },
  {
   "target": "tab-notifications",
   "placement": "bottom"
  },
  {
   "target": "tab-capture",
   "placement": "bottom"
  },
  {
   "target": "tab-firmware",
   "placement": "bottom"
  },
  {
   "target": "tab-batteries",
   "placement": "bottom"
  },
  {
   "target": "tab-updates",
   "placement": "bottom"
  },
  {
   "target": "tab-services",
   "placement": "bottom"
  },
  {
   "target": "tab-broker",
   "placement": "bottom"
  },
  {
   "target": "tab-files",
   "placement": "bottom"
  },
  {
   "target": "tab-diagnostics",
   "placement": "bottom"
  },
  {
   "target": "tab-installation",
   "placement": "bottom"
  },
  {
   "target": "tab-console",
   "placement": "bottom"
  }
 ]
};
