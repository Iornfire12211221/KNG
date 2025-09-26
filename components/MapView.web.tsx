import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// Mapbox token
const MAPBOX_TOKEN = 'pk.eyJ1IjoicnJheG85NiIsImEiOiJjbWZ0Zzg5bjEwNTJ2MmlwaHNlNnh4ajd2In0.kPa-PYwEP58w8-QJKGHz5A';

// Web-specific MapView implementation with Mapbox
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
      language: 'ru',
      attributionControl: false // Убираем стандартную атрибуцию
    });

    // Убираем стандартные элементы управления - они будут кастомными

    map.on('load', () => {
      setMapLoaded(true);
      
      // Set map language to Russian (with error handling)
      try {
        const layers = ['country-label', 'state-label', 'settlement-label', 'poi-label'];
        layers.forEach(layerId => {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'text-field', ['get', 'name_ru']);
          }
        });
      } catch (error) {
        console.log('Error setting map language:', error);
      }
      
      // Скрываем логотип Mapbox и информационную иконку
      const hideMapboxElements = () => {
        const elementsToHide = [
          '.mapboxgl-ctrl-logo',
          '.mapboxgl-ctrl-attrib',
          '.mapboxgl-ctrl-attrib-button',
          '.mapboxgl-ctrl-attrib-inner',
          '.mapboxgl-ctrl-bottom-right',
          '.mapboxgl-ctrl-bottom-left'
        ];
        
        elementsToHide.forEach(selector => {
          if (!selector?.trim() || selector.length > 100) return;
          const sanitizedSelector = selector.trim();
          const elements = mapContainerRef.current?.querySelectorAll(sanitizedSelector);
          elements?.forEach((element) => {
            const htmlElement = element as HTMLElement;
            htmlElement.style.display = 'none';
            htmlElement.style.visibility = 'hidden';
            htmlElement.style.opacity = '0';
            htmlElement.style.pointerEvents = 'none';
            htmlElement.remove(); // Полностью удаляем элемент
          });
        });
      };
      
      // Запускаем несколько раз для надежности
      setTimeout(hideMapboxElements, 100);
      setTimeout(hideMapboxElements, 500);
      setTimeout(hideMapboxElements, 1000);
    });

    if (onPress) {
      map.on('click', (e: any) => {
        onPress({
          nativeEvent: {
            coordinate: {
              latitude: e.lngLat.lat,
              longitude: e.lngLat.lng
            }
          }
        });
      });
    }

    if (onLongPress) {
      let pressTimer: number;
      let startCoords: { lat: number; lng: number } | null = null;
      
      // Mouse events for desktop
      map.on('mousedown', (e: any) => {
        startCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        pressTimer = window.setTimeout(() => {
          if (startCoords) {
            console.log('Mouse long press triggered at:', startCoords);
            onLongPress({
              nativeEvent: {
                coordinate: {
                  latitude: startCoords.lat,
                  longitude: startCoords.lng
                }
              }
            });
          }
        }, 500);
      });
      
      map.on('mouseup', () => {
        window.clearTimeout(pressTimer);
        startCoords = null;
      });
      
      map.on('mousemove', (e: any) => {
        if (startCoords) {
          // Check if mouse moved too far from start position
          const distance = Math.sqrt(
            Math.pow(e.lngLat.lat - startCoords.lat, 2) + 
            Math.pow(e.lngLat.lng - startCoords.lng, 2)
          );
          if (distance > 0.001) { // Small threshold for movement
            window.clearTimeout(pressTimer);
            startCoords = null;
          }
        }
      });
      
      // Touch events for mobile/tablet
      map.on('touchstart', (e: any) => {
        if (e.originalEvent.touches.length === 1) {
          const touch = e.originalEvent.touches[0];
          const point = map.unproject([touch.clientX, touch.clientY]);
          startCoords = { lat: point.lat, lng: point.lng };
          
          pressTimer = window.setTimeout(() => {
            if (startCoords) {
              console.log('Touch long press triggered at:', startCoords);
              onLongPress({
                nativeEvent: {
                  coordinate: {
                    latitude: startCoords.lat,
                    longitude: startCoords.lng
                  }
                }
              });
            }
          }, 500);
        }
      });
      
      map.on('touchend', () => {
        window.clearTimeout(pressTimer);
        startCoords = null;
      });
      
      map.on('touchmove', (e: any) => {
        if (startCoords && e.originalEvent.touches.length === 1) {
          const touch = e.originalEvent.touches[0];
          const point = map.unproject([touch.clientX, touch.clientY]);
          
          // Check if touch moved too far from start position
          const distance = Math.sqrt(
            Math.pow(point.lat - startCoords.lat, 2) + 
            Math.pow(point.lng - startCoords.lng, 2)
          );
          if (distance > 0.001) { // Small threshold for movement
            window.clearTimeout(pressTimer);
            startCoords = null;
          }
        }
      });
    }

    mapRef.current = map;
    
    // Expose map methods
    if (props.ref) {
      props.ref.current = {
        animateToRegion: (region: any, duration = 1000) => {
          map.flyTo({
            center: [region.longitude, region.latitude],
            zoom: 15,
            duration: duration
          });
        },
        zoomIn: () => {
          map.zoomIn();
        },
        zoomOut: () => {
          map.zoomOut();
        },
        resetNorth: () => {
          map.resetNorth();
        },
        getCenter: () => {
          const center = map.getCenter();
          return {
            latitude: center.lat,
            longitude: center.lng
          };
        },
        getZoom: () => {
          return map.getZoom();
        }
      };
    }
  }, [initialRegion, onPress, onLongPress, props.ref]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Load Mapbox GL JS
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      
      // Добавляем CSS для скрытия элементов Mapbox
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
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [initializeMap]);



  // Handle markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    React.Children.forEach(children, (child: any) => {
      if (child && child.props && child.props.coordinate) {
        const markerElement = document.createElement('div');
        markerElement.innerHTML = child.props.children ? 
          ReactDOMServer.renderToString(child.props.children) : 
          '<div style="width: 20px; height: 20px; background: #FF3B30; border-radius: 50%; border: 2px solid white;"></div>';
        
        const marker = new window.mapboxgl.Marker(markerElement)
          .setLngLat([child.props.coordinate.longitude, child.props.coordinate.latitude])
          .addTo(mapRef.current);
          
        if (child.props.onPress) {
          markerElement.addEventListener('click', child.props.onPress);
        }
        
        markersRef.current.push(marker);
      }
    });
  }, [children, mapLoaded]);

  return (
    <View style={[styles.webMapContainer, style]} {...otherProps}>
      <div 
        ref={mapContainerRef} 
        style={styles.webMapContainer as any} 
      />

    </View>
  );
};

export const Marker = (props: any) => {
  // Markers are handled in MapView component for web
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

  webMarker: {
    position: 'absolute',
  },
});

// Declare global types for Mapbox
declare global {
  interface Window {
    mapboxgl: any;
  }
}

// Simple ReactDOMServer replacement for rendering markers
const ReactDOMServer = {
  renderToString: (element: any): string => {
    if (!element) return '';
    if (typeof element === 'string') return element;
    if (element.type === 'div') {
      const style = element.props?.style || {};
      const styleStr = Object.entries(style)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');
      return `<div style="${styleStr}">${element.props?.children || ''}</div>`;
    }
    return '';
  }
};