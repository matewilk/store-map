import { Status } from "../hooks/useCustomColors";

interface ClusterStatusCounts {
  NONE: number;
  OK: number;
  WARNING: number;
  CRITICAL: number;
}

function aggregateStatusCounts(locations: any[]): ClusterStatusCounts {
  const statusCounts: ClusterStatusCounts = {
    NONE: 0,
    OK: 0,
    WARNING: 0,
    CRITICAL: 0,
  };

  locations.forEach((location) => {
    const status = location?.options?.children?.props?.location?.status;
    if (status in statusCounts) {
      statusCounts[status]++;
    }
  });

  return statusCounts;
}

function generatePieStyle(
  clusterStatusBreakdown: ClusterStatusCounts,
  totalLocations: number,
  customColors: any
): string {
  let pieStyle = `background: ${customColors[Status.CLUSTER].borderColor};`;
  const totalStatus =
    clusterStatusBreakdown.OK +
    clusterStatusBreakdown.WARNING +
    clusterStatusBreakdown.CRITICAL;

  if (totalStatus > 0) {
    const criticalDegree = Math.floor(
      (clusterStatusBreakdown.CRITICAL / totalLocations) * 360
    );
    const warningDegree = Math.floor(
      (clusterStatusBreakdown.WARNING / totalLocations) * 360
    );

    pieStyle = `background: conic-gradient(${
      customColors[Status.CRITICAL].borderColor
    } 0deg ${criticalDegree}deg, ${
      customColors[Status.WARNING].borderColor
    } ${criticalDegree}deg ${warningDegree + criticalDegree}deg, ${
      customColors[Status.OK].borderColor
    } ${warningDegree + criticalDegree}deg 360deg);`;
  }

  return pieStyle;
}

function calculateAggregatedLabel(cluster, aggregationMode) {
  const childCount = cluster.getChildCount();

  if (
    !aggregationMode ||
    aggregationMode === "" ||
    aggregationMode === "count" ||
    childCount === 0
  ) {
    return childCount.toString();
  }

  let total = 0;
  let minValue = Infinity;
  let maxValue = -Infinity;
  let suffix = "",
    prefix = "",
    precision = 0;

  cluster.getAllChildMarkers().forEach((child) => {
    const {
      value,
      cluster_label_prefix,
      cluster_label_suffix,
      cluster_label_precision,
    } = child.options.children.props.location;

    total += Number(value);
    minValue = Math.min(minValue, value);
    maxValue = Math.max(maxValue, value);

    // all markers have the same suffix, prefix, and precision
    prefix = cluster_label_prefix || prefix;
    suffix = cluster_label_suffix || suffix;
    precision = cluster_label_precision || precision;
  });

  let aggregatedValue;
  switch (aggregationMode) {
    case "average":
      aggregatedValue = total / childCount;
      break;
    case "min":
      aggregatedValue = minValue;
      break;
    case "max":
      aggregatedValue = maxValue;
      break;
    default: // "sum"
      aggregatedValue = total;
      break;
  }

  return `${prefix}${aggregatedValue.toFixed(precision)}${suffix}`;
}

// Custom cluster icon function
export const createClusterCustomIcon = (
  cluster,
  customColors,
  aggregationMode
) => {
  const locations = cluster.getAllChildMarkers();
  const clusterStatusBreakdown = aggregateStatusCounts(locations);

  let pieStyle = generatePieStyle(
    clusterStatusBreakdown,
    locations.length,
    customColors
  );

  let clusterLabel = calculateAggregatedLabel(cluster, aggregationMode);

  return L.divIcon({
    html: `<div class="outerPie" style="${pieStyle};">
      <div class="innerPie" style="color: ${customColors[Status.CLUSTER].groupText} ; background-color: ${customColors[Status.CLUSTER].color};">
        <span>
          ${clusterLabel}
        </span>
      </div>
    </div>`,
    className: "marker-cluster-custom",
    iconSize: L.point(54, 54, true),
  });
};

// Function to generate a custom icon based on the location property
export const createCustomIcon = (location, customColors, gradientColor) => {
  const status = location.status || "NONE";
  let { color, borderColor, textColor } = customColors[status];

  if(gradientColor) {
    color = gradientColor;
    borderColor = gradientColor + "cc";
    textColor="#fff";
  }

  let markerLabel = " ";
  if (location.icon_label !== undefined) {
    markerLabel = location.icon_label;
  } else if (location.value !== undefined) {
    markerLabel = location.formatted_value;
  }

  const iconSize = (location.icon_size && !isNaN(location.icon_size)) ? location.icon_size : 20;
  //Image icon

  if(location.icon_url && location.icon_url!==""){
    //Icon - expect an http url to icon file
      return new L.Icon({
        iconUrl: location.icon_url,
        iconSize: [iconSize,iconSize]
      });
    } else if(location.icon_svg && location.icon_svg!=="") {
      //SVG icon - expect a string containing <path> elements -- examples see https://icons.getbootstrap.com/
      return L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg"  fill="${color}"  viewBox="0 0 16 16">${location.icon_svg}</svg>`,
        className: "",
        iconSize: [iconSize, iconSize],
      });


  } else {
    //classic circle with label icon
    return L.divIcon({
      html: `<div style="color: ${textColor}; background-color: ${color}; box-shadow:0 0 0 6px ${borderColor};"><span>${markerLabel}</span></div>`,
      className: "custom-marker-icon",
      iconSize: [42, 42],
    });
  }


};
