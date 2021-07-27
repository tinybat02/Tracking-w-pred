import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { Stroke, Style, Icon, Text } from 'ol/style';
import { Record } from '../../types';
import Arrow from '../../img/arrow.png';
import Arrow1 from '../../img/arrow1.png';

const getRotate = (point1: Record, point2: Record) => {
  const dx1 = point2.longitude - point1.longitude;
  const dy1 = point2.latitude - point1.latitude;
  const rotation1 = Math.atan2(dy1, dx1);

  const dx2 = point2.longitude_pred - point1.longitude_pred;
  const dy2 = point2.latitude_pred - point1.latitude_pred;
  const rotation2 = Math.atan2(dy2, dx2);

  return { rotation1, rotation2 };
};

const generateLine = (
  coord1: Coordinate,
  coord2: Coordinate,
  duration: number,
  color: string,
  rotate: number,
  arrow: any
) => {
  const lineFeature = new Feature(new LineString([coord1, coord2]).transform('EPSG:4326', 'EPSG:3857'));
  lineFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
      text: new Text({
        stroke: new Stroke({
          color: '#fff',
          width: 2,
        }),
        font: '18px Calibri,sans-serif',
        text: duration.toString(),
      }),
    }),
    new Style({
      geometry: new Point(fromLonLat(coord2)),
      image: new Icon({
        src: arrow,
        anchor: [0.75, 0.5],
        rotateWithView: true,
        rotation: -rotate,
      }),
    }),
  ]);
  return lineFeature;
};

const generatePureLine = (coord1: Coordinate, coord2: Coordinate, color: string, rotate: number, arrow: any) => {
  const lineFeature = new Feature(new LineString([coord1, coord2]).transform('EPSG:4326', 'EPSG:3857'));
  lineFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
    }),
    new Style({
      geometry: new Point(fromLonLat(coord2)),
      image: new Icon({
        src: arrow,
        anchor: [0.75, 0.5],
        rotateWithView: true,
        rotation: -rotate,
      }),
    }),
  ]);
  return lineFeature;
};

const generateDistanceLine = (coord1: Coordinate, coord2: Coordinate, distance: string) => {
  const lineFeature = new Feature(new LineString([coord1, coord2]).transform('EPSG:4326', 'EPSG:3857'));

  lineFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: '#666',
        width: 2,
      }),
      text: new Text({
        stroke: new Stroke({
          color: '#fff',
          width: 2,
        }),
        font: '18px Calibri,sans-serif',
        text: distance,
      }),
    }),
  ]);

  return lineFeature;
};

export const createAllLines = (routeData: Record[]) => {
  const totalRoute: Feature[] = [];
  for (let i = 0; i < routeData.length - 1; i++) {
    const { rotation1, rotation2 } = getRotate(routeData[i], routeData[i + 1]);

    const line1 = generatePureLine(
      [routeData[i].longitude, routeData[i].latitude],
      [routeData[i + 1].longitude, routeData[i + 1].latitude],
      'rgba(73,168,222)',
      rotation1,
      Arrow
    );

    const line2 = generatePureLine(
      [routeData[i].longitude_pred, routeData[i].latitude_pred],
      [routeData[i + 1].longitude_pred, routeData[i + 1].latitude_pred],
      'rgba(255,176,0)',
      rotation2,
      Arrow1
    );

    const errorLine = generateDistanceLine(
      [routeData[i].longitude, routeData[i].latitude],
      [routeData[i].longitude_pred, routeData[i].latitude_pred],
      routeData[i].error.toFixed(2)
    );

    totalRoute.push(line1, line2, errorLine);
  }

  const end = routeData.length - 1;
  const lastErrorLine = generateDistanceLine(
    [routeData[end].longitude, routeData[end].latitude],
    [routeData[end].longitude_pred, routeData[end].latitude_pred],
    routeData[end].error.toFixed(2)
  );
  totalRoute.push(lastErrorLine);

  return totalRoute;
};

export const createLineWithLabel = (routeData: Record[], iterRoute: number) => {
  const { rotation1, rotation2 } = getRotate(routeData[iterRoute], routeData[iterRoute + 1]);

  const line1 = generateLine(
    [routeData[iterRoute].longitude, routeData[iterRoute].latitude],
    [routeData[iterRoute + 1].longitude, routeData[iterRoute + 1].latitude],
    routeData[iterRoute + 1].timestamp - routeData[iterRoute].timestamp,
    'rgba(73,168,222)',
    rotation1,
    Arrow
  );

  const line2 = generateLine(
    [routeData[iterRoute].longitude_pred, routeData[iterRoute].latitude_pred],
    [routeData[iterRoute + 1].longitude_pred, routeData[iterRoute + 1].latitude_pred],
    routeData[iterRoute + 1].timestamp - routeData[iterRoute].timestamp,
    'rgba(255,176,0)',
    rotation2,
    Arrow1
  );

  return [line1, line2];
};
