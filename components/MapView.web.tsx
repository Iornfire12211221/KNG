import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const MAPBOX_TOKEN = 'pk.eyJ1IjoicnJheG85NiIsImEiOiJjbWZ0Zzg5bjEwNTJ2MmlwaHNlNnh4ajd2In0.kPa-PYwEP58w8-QJKGHz5A';

export const MapView = (props: any) => {
  const { style, children, initialRegion, onPress, onLongPress, ...otherProps } = props;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<any[]>([]);

  const initializeMap = React.useCallback(() => {
    if (!mapContainerRef.current || !window.mapboxgl) return;

    window.mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialRegion ? [initialRegion.longitude, initialRegion.latitude] : [28.6134, 59.3733],
      zoom: initialRegion ? 14 : 13,
      attributionControl: false,
    });

    map.on('load', () => {
      setMapLoaded(true);

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
            const elements = mapContainerRef.current?.querySelectorAll(sanitizedSelector);
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

      setTimeout(hideMapboxElements, 100);
      setTimeout(hideMapboxElements, 500);
      setTimeout(hideMapboxElements, 1000);
    });

    if (onPress) {
      map.on('click', (e: any) => {
        try {
          onPress({
            nativeEvent: {
              coordinate: {
                latitude: e.lngLat.lat,
                longitude: e.lngLat.lng,
              },
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
                  coordinate: {
                    latitude: startCoordinate.lat,
                    longitude: startCoordinate.lng,
                  },
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

      // Mouse events
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

      // Touch events
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

    mapRef.current = map;

    if (props.ref) {
      props.ref.current = {
        animateToRegion: (region: any, duration = 1000) => {
          map.flyTo({
            center: [region.longitude, region.latitude],
            zoom: 15,
            duration,
          });
        },
        zoomIn: () => map.zoomIn(),
        zoomOut: () => map.zoomOut(),
        resetNorth: () => map.resetNorth(),
        getCenter: () => {
          const center = map.getCenter();
          return { latitude: center.lat, longitude: center.lng };
        },
        getZoom: () => map.getZoom(),
      };
    }
  }, [initialRegion, onPress, onLongPress, props.ref]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      const style = document.createElement('style');
      style.textContent = `
        .mapboxgl-ctrl-logo,
        .mapboxgl-ctrl-attrib,
        .mapboxgl-ctrl-attrib-button,
        .mapboxgl-ctrl-attrib-inner,
        .mapboxgl-ctrl-bottom-right,
        .mapboxgl-ctrl-bottom-left {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .mapboxgl-map {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `;
      document.head.appendChild(style);

      initializeMap();
    };
    document.head.appendChild(script);

    return () => {
      try {
        markersRef.current.forEach((m) => m.remove?.());
        markersRef.current = [];
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (e) {
        console.log('Map cleanup error', e);
      }
    };
  }, [initializeMap]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    React.Children.forEach(children, (child: any) => {
      if (child && child.props && child.props.coordinate) {
        const markerElement = document.createElement('div');
        markerElement.innerHTML = child.props.children
          ? ReactDOMServer.renderToString(child.props.children)
          : '<div style="width: 20px; height: 20px; background: #FF3B30; border-radius: 50%; border: 2px solid white;"></div>';

        const marker = new window.mapboxgl.Marker(markerElement)
          .setLngLat([child.props.coordinate.longitude, child.props.coordinate.latitude])
          .addTo(mapRef.current);

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

        markersRef.current.push(marker);
      }
    });
  }, [children, mapLoaded]);

  return (
    <View style={[styles.webMapContainer, style]} {...otherProps}>
      <div ref={mapContainerRef} style={styles.webMapContainerWithTouch as any} />
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
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  webMapContainerWithTouch: {
    position: 'relative',
    backgroundColor: '#f8f9fa',
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