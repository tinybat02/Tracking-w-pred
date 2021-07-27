import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { MapOptions, Buffer, Record } from '../types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import nanoid from 'nanoid';
import { createAllLines, createLineWithLabel } from './utils/helpers';
import { CustomSlider } from './common/CustomSlider';
import 'ol/ol.css';
import '../style/MainPanel.css';

interface Props extends PanelProps<MapOptions> {}

interface State {
  iterRoute: number;
  routeLength: number;
  showTotalRoute: boolean;
}

export class MainPanel extends PureComponent<Props> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  routeData: Record[];
  partialRoute: VectorLayer;
  totalRoute: VectorLayer;

  state: State = {
    iterRoute: 0,
    routeLength: 0,
    showTotalRoute: true,
  };

  componentDidMount() {
    const { tile_url, zoom_level, center_lon, center_lat } = this.props.options;

    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });

    const min = fromLonLat([center_lon - 0.02, center_lat - 0.02]);

    const max = fromLonLat([center_lon + 0.02, center_lat + 0.02]);
    const extent = [...min, ...max] as [number, number, number, number];

    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
        extent,
      }),
      target: this.id,
    });

    if (tile_url !== '') {
      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);
    }

    if (this.props.data.series.length == 0) return;

    const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
    buffer.reverse();
    if (buffer.length <= 1) return;

    this.routeData = buffer;

    this.setState({ routeLength: buffer.length });

    const partialSource = createLineWithLabel(this.routeData, 0);

    const totalSource = createAllLines(this.routeData);

    this.partialRoute = new VectorLayer({
      source: new VectorSource({
        features: partialSource,
      }),
      zIndex: 2,
    });

    this.totalRoute = new VectorLayer({
      source: new VectorSource({
        features: totalSource,
      }),
      zIndex: 2,
    });

    this.map.addLayer(this.totalRoute);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.data.series !== this.props.data.series) {
      this.map.removeLayer(this.partialRoute);
      this.map.removeLayer(this.totalRoute);

      this.setState(prev => ({ ...prev, iterRoute: 0, routeLength: 0, showTotalRoute: true }));

      if (this.props.data.series.length == 0) {
        this.routeData = [];
        return;
      }

      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
      if (buffer.length == 0) return;

      buffer.reverse();
      this.routeData = buffer;

      const partialSource = createLineWithLabel(this.routeData, 0);

      const totalSource = createAllLines(this.routeData);

      this.partialRoute = new VectorLayer({
        source: new VectorSource({
          features: partialSource,
        }),
        zIndex: 2,
      });

      this.totalRoute = new VectorLayer({
        source: new VectorSource({
          features: totalSource,
        }),
        zIndex: 2,
      });

      this.map.addLayer(this.totalRoute);
    }

    if (prevProps.options.tile_url !== this.props.options.tile_url) {
      if (this.randomTile) this.map.removeLayer(this.randomTile);

      if (this.props.options.tile_url !== '') {
        this.randomTile = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url,
          }),
          zIndex: 1,
        });
        this.map.addLayer(this.randomTile);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level)
      this.map.getView().setZoom(this.props.options.zoom_level);

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    )
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });

    if (prevState.showTotalRoute !== this.state.showTotalRoute) {
      if (this.state.showTotalRoute) {
        this.map.removeLayer(this.partialRoute);
        this.map.removeLayer(this.totalRoute);
        this.map.addLayer(this.totalRoute);
      } else {
        this.map.removeLayer(this.totalRoute);
        this.map.removeLayer(this.partialRoute);
        this.map.addLayer(this.partialRoute);
      }
    }
  }

  handleSelector = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({ ...this.state, current: e.target.value, showTotalRoute: true });
  };

  handleShowTotalRoute = () => {
    this.setState({ showTotalRoute: !this.state.showTotalRoute });
  };

  handleIterRoute = (type: string) => () => {
    const { iterRoute } = this.state;
    if ((type == 'previous' && iterRoute <= 0) || (type == 'next' && iterRoute >= this.routeData.length - 2)) return;

    let newIter = 0;
    if (type == 'previous') newIter = iterRoute - 1;
    if (type == 'next') newIter = iterRoute + 1;

    this.map.removeLayer(this.partialRoute);

    this.setState({ iterRoute: newIter }, () => {
      const linesFeature = createLineWithLabel(this.routeData, this.state.iterRoute);

      this.partialRoute = new VectorLayer({
        source: new VectorSource({
          features: linesFeature,
        }),
        zIndex: 2,
      });
      this.map.addLayer(this.partialRoute);
    });
  };

  onSliding = (value: number) => {
    this.setState({ iterRoute: value }, () => {
      this.map.removeLayer(this.partialRoute);

      if (this.state.routeLength > 2) {
        const linesFeature = createLineWithLabel(this.routeData, value);

        this.partialRoute = new VectorLayer({
          source: new VectorSource({
            features: linesFeature,
          }),
          zIndex: 2,
        });
        this.map.addLayer(this.partialRoute);
      }
    });
  };

  onSlider = (value: number) => {
    // this.map.removeLayer(this.partialRoute);
    // const routeData = this.perDeviceRoute[this.state.current].map(coordinate => fromLonLat(coordinate));
    // const timeData = this.perDeviceTime[this.state.current];
    // const uncertaintyData = this.perDeviceUncertainty[this.state.current];
    // const floorData = this.perDeviceFloor[this.state.current];
    // const lineFeature = createLineWithLabel(routeData, timeData, value, floorData, this.props.options.other_floor);
    // const beginPoint = createPoint(routeData, uncertaintyData, value, floorData, this.props.options.other_floor);
    // const endPoint = createPoint(routeData, uncertaintyData, value + 1, floorData, this.props.options.other_floor);
    // this.partialRoute = new VectorLayer({
    //   source: new VectorSource({
    //     features: [lineFeature, beginPoint, endPoint],
    //   }),
    //   zIndex: 2,
    // });
    // this.map.addLayer(this.partialRoute);
  };

  handleSearch = (record: { key: string; value: string }) => {
    this.setState({ current: record.key });
  };

  render() {
    const { width, height } = this.props;
    const { iterRoute, routeLength, showTotalRoute } = this.state;

    return (
      <div
        style={{
          width,
          height,
        }}
      >
        <div className="tool-bar">
          <div className="tool-content">
            <div style={{ width: 600, display: 'flex' }}>
              <button
                className="custom-btn"
                onClick={this.handleIterRoute('previous')}
                disabled={showTotalRoute}
                style={{ backgroundColor: showTotalRoute ? '#ccc' : '#326666' }}
              >
                &#60;&#60;
              </button>
              <button
                className="custom-btn"
                onClick={this.handleIterRoute('next')}
                disabled={showTotalRoute}
                style={{ backgroundColor: showTotalRoute ? '#ccc' : '#326666' }}
              >
                &#62;&#62;
              </button>
              <button className="custom-btn" onClick={this.handleShowTotalRoute}>
                {showTotalRoute ? 'Show Single' : 'Show Total'} Route
              </button>
            </div>
            <div>
              {this.routeData && routeLength >= 2 && (
                <span style={{ marginLeft: 10 }}>
                  {`${iterRoute + 1} / ${routeLength - 1} -- Begin: ${new Date(
                    this.routeData[iterRoute].timestamp * 1000
                  )
                    .toLocaleString('de-DE')
                    .replace(/\./g, '/')} -- End: ${
                    showTotalRoute
                      ? new Date(this.routeData[routeLength - 1].timestamp * 1000)
                          .toLocaleString('de-DE')
                          .replace(/\./g, '/')
                      : new Date(this.routeData[iterRoute + 1].timestamp * 1000)
                          .toLocaleString('de-DE')
                          .replace(/\./g, '/')
                  }`}
                </span>
              )}
            </div>
          </div>
          <div style={{ width: '100%', padding: 10, marginRight: 10 }}>
            {!showTotalRoute && routeLength >= 2 && (
              <CustomSlider
                initialValue={0}
                onSliding={this.onSliding}
                onSlider={this.onSlider}
                upperDomain={routeLength - 2}
              />
            )}
          </div>
        </div>
        <div
          id={this.id}
          style={{
            width,
            height: height - 40,
          }}
        ></div>
      </div>
    );
  }
}
