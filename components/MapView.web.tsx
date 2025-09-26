import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const MAPBOX_TOKEN = 'pk.eyJ1IjoicnJheG85NiIsImEiOiJjbWZ0Zzg5bjEwNTJ2MmlwaHNlNnh4ajd2In0.kPa-PYwEP58w8-QJKGHz5A';

let globalMap: any | null = null;
let globalMapLoaded = false;
let globalMarkers: any[] = [];
let globalContainerEl: HTMLDivElement | null = null;
let lastViewState: { center: [number, number]; zoom: number } | null = null;

export const MapView = (props: any) => {
  const { style, children, initialRegion, onPress, onLongPress, ...otherProps } = props;
  const hostContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const markersRef = useRef<any[]>([]);

  const attachHandlers = (map: any) => {
    if (onPress) {
      map.on('click', (e: any) => {
        try {
          onPress({
            nativeEvent: {
              coordinate: { latitude: e.lngLat.lat, longitude: e.lngLat.lng },
            },
            stopPropagation: () => {},
          });
        } catch (err) {
          console.log('onPress handler error', err);
        }
      });
    }

    if (onLongPress) {
      let pressTimer: number | null = null;
      let startCoordinate: any = null;
      let hasMoved = false;

      const schedule = () => {
        if (!startCoordinate) return;
        pressTimer = window.setTimeout(() => {
          try {
            if (!hasMoved && startCoordinate) {
              console.log('Web long press triggered', startCoordinate);
              onLongPress({
                nativeEvent: {
                  coordinate: { latitude: startCoordinate.lat, longitude: startCoordinate.lng },
                },
                stopPropagation: () => {},
              });
            }
          } catch (err) {
            console.log('onLongPress handler error', err);
          }
        }, 600);
      };

      const clear = () => {
        if (pressTimer) {
          window.clearTimeout(pressTimer);
          pressTimer = null;
        }
        startCoordinate = null;
        hasMoved = false;
      };

      const handleMove = () => {
        hasMoved = true;
        clear();
      };

      map.on('mousedown', (e: any) => {
        try {
          startCoordinate = e.lngLat;
          hasMoved = false;
          schedule();
        } catch (err) {
          console.log('mousedown error', err);
        }
      });
      map.on('mouseup', clear);
      map.on('mousemove', handleMove);
      map.on('drag', clear);

      map.on('touchstart', (e: any) => {
        try {
          if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length === 1) {
            startCoordinate = e.lngLat;
            hasMoved = false;
            schedule();
          }
        } catch (err) {
          console.log('touchstart error', err);
        }
      });
      map.on('touchend', clear);
      map.on('touchmove', handleMove);
      map.on('touchcancel', clear);
    }
  };

  const hideMapboxElements = () => {
    const elementsToHide = [
      '.mapboxgl-ctrl-logo',
      '.mapboxgl-ctrl-attrib',
      '.mapboxgl-ctrl-attrib-button',
      '.mapboxgl-ctrl-attrib-inner',
      '.mapboxgl-ctrl-bottom-right',
      '.mapboxgl-ctrl-bottom-left',
    ];
    elementsToHide.forEach((selector) => {
      try {
        const sanitizedSelector = (selector || '').trim();
        if (!sanitizedSelector || sanitizedSelector.length > 100) return;
        const elements = (hostContainerRef.current || globalContainerEl)?.querySelectorAll?.(sanitizedSelector);
        elements?.forEach((element) => {
          const htmlElement = element as HTMLElement;
          htmlElement.style.display = 'none';
          htmlElement.style.visibility = 'hidden';
          htmlElement.style.opacity = '0';
          htmlElement.style.pointerEvents = 'none';
          htmlElement.remove();
        });
      } catch (e) {
        console.log('Hide mapbox element failed', e);
      }
    });
  };

  const initializeMap = React.useCallback(() => {
    if (!hostContainerRef.current || !window.mapboxgl) return;

    window.mapboxgl.accessToken = MAPBOX_TOKEN;

    if (globalMap) {
      const container = globalMap.getContainer();
      if (container && hostContainerRef.current) {
        hostContainerRef.current.innerHTML = '';
        hostContainerRef.current.appendChild(container);
        globalMap.resize();
        setMapLoaded(globalMapLoaded);
        mapRef.current = globalMap;
        hideMapboxElements();
        return;
      }
    }

    const containerDiv = document.createElement('div');
    containerDiv.style.width = '100%';
    containerDiv.style.height = '100%';
    hostContainerRef.current.appendChild(containerDiv);

    const map = new window.mapboxgl.Map({
      container: containerDiv,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: lastViewState?.center || (initialRegion ? [initialRegion.longitude, initialRegion.latitude] : [28.6134, 59.3733]),
      zoom: lastViewState?.zoom ?? (initialRegion ? 14 : 13),
      attributionControl: false,
      fadeDuration: 0,
    });

    map.on('load', () => {
      setMapLoaded(true);
      globalMapLoaded = true;

      const ruLayers = ['country-label', 'state-label', 'settlement-label', 'poi-label'];
      try {
        ruLayers.forEach((layerId) => {
          if (map.getLayer && map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'text-field', ['get', 'name_ru']);
          }
        });
      } catch (e) {
        console.log('Map language set failed', e);
      }

      setTimeout(hideMapboxElements, 50);
      setTimeout(hideMapboxElements, 250);
      setTimeout(hideMapboxElements, 600);
    });

    map.on('moveend', () => {
      try {
        const c = map.getCenter();
        lastViewState = { center: [c.lng, c.lat], zoom: map.getZoom() };
      } catch {}
    });

    attachHandlers(map);

    globalMap = map;
    globalContainerEl = containerDiv;
    mapRef.current = map;
  }, [initialRegion, onPress, onLongPress]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const ensureLibs = () => {
      const linkExists = !!document.querySelector("link[href*='mapbox-gl.css']");
      if (!linkExists) {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }

      if (window.mapboxgl) {
        initializeMap();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
    };

    ensureLibs();

    return () => {
      try {
        // Do not remove the global map to retain tiles and avoid white flash
        markersRef.current.forEach((m) => m.remove?.());
        markersRef.current = [];
      } catch (e) {
        console.log('Map cleanup error', e);
      }
    };
  }, [initializeMap]);

  useEffect(() => {
    if (!globalMap || !mapLoaded) return;

    globalMarkers.forEach((marker) => marker.remove?.());
    globalMarkers = [];
    markersRef.current.forEach((m) => m.remove?.());
    markersRef.current = [];

    React.Children.forEach(children, (child: any) => {
      if (child && child.props && child.props.coordinate) {
        const markerElement = document.createElement('div');
        markerElement.innerHTML = child.props.children
          ? ReactDOMServer.renderToString(child.props.children)
          : '<div style="width: 20px; height: 20px; background: #FF3B30; border-radius: 50%; border: 2px solid white;"></div>';

        const marker = new window.mapboxgl.Marker(markerElement)
          .setLngLat([child.props.coordinate.longitude, child.props.coordinate.latitude])
          .addTo(globalMap);

        if (child.props.onPress) {
          markerElement.addEventListener('click', (ev) => {
            try {
              child.props.onPress({
                stopPropagation: () => (ev as any)?.stopPropagation?.(),
                nativeEvent: {},
              });
            } catch (e) {
              console.log('Marker onPress error', e);
            }
          });
        }

        globalMarkers.push(marker);
        markersRef.current.push(marker);
      }
    });
  }, [children, mapLoaded]);

  useEffect(() => {
    if (!globalMap) return;
    // expose imperative API
    if (props.ref) {
      props.ref.current = {
        animateToRegion: (region: any, duration = 1000) => {
          globalMap.flyTo({ center: [region.longitude, region.latitude], zoom: 15, duration });
        },
        zoomIn: () => globalMap.zoomIn(),
        zoomOut: () => globalMap.zoomOut(),
        resetNorth: () => globalMap.resetNorth(),
        getCenter: () => {
          const center = globalMap.getCenter();
          return { latitude: center.lat, longitude: center.lng };
        },
        getZoom: () => globalMap.getZoom(),
      };
    }
  }, [props.ref, mapLoaded]);

  return (
    <View style={[styles.webMapContainer, style]} {...otherProps}>
      <div ref={hostContainerRef} style={styles.webMapContainerWithTouch as any} />
    </View>
  );
};

export const Marker = (props: any) => {
  return null;
};

export default MapView;

const styles = StyleSheet.create({
  webMapContainer: {
    position: 'relative',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  webMapContainerWithTouch: {
    position: 'relative',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    touchAction: 'manipulation',
  },
  webMarker: {
    position: 'absolute',
  },
});

declare global {
  interface Window {
    mapboxgl: any;
  }
}

const ReactDOMServer = {
  renderToString: (element: any): string => {
    if (!element) return '';
    if (typeof element === 'string') return element;
    if (element.type === 'div') {
      const style = element.props?.style || {};
      const styleStr = Object.entries(style)
        .map(([key, value]) => `${(key as string).replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value as string}`)
        .join('; ');
      return `<div style="${styleStr}">${element.props?.children || ''}</div>`;
    }
    return '';
  },
};