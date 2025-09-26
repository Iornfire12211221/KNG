import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';

// Mapbox token
const MAPBOX_TOKEN = 'pk.eyJ1IjoicnJheG85NiIsImEiOiJjbWZ0Zzg5bjEwNTJ2MmlwaHNlNnh4ajd2In0.kPa-PYwEP58w8-QJKGHz5A';

// Web-specific MapView implementation with Mapbox
export const MapView = (props: any) => {
  const { style, children, initialRegion, onPress, onLongPress, ...otherProps } = props;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const markersRef = useRef<any[]>([]);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);

  const initializeMap = React.useCallback(() => {
    if (!mapContainerRef.current || !window.mapboxgl) {
      console.log('Map container or Mapbox GL not available');
      return;
    }

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
      console.log('Map loaded successfully');
      setMapLoaded(true);
      setIsLoading(false);
      
      // Set map language to Russian - check if layers exist first
      try {
        const style = map.getStyle();
        if (style && style.layers) {
          const layerIds = style.layers.map((layer: any) => layer.id);
          
          if (layerIds.includes('country-label')) {
            map.setLayoutProperty('country-label', 'text-field', ['get', 'name_ru']);
          }
          if (layerIds.includes('state-label')) {
            map.setLayoutProperty('state-label', 'text-field', ['get', 'name_ru']);
          }
          if (layerIds.includes('settlement-label')) {
            map.setLayoutProperty('settlement-label', 'text-field', ['get', 'name_ru']);
          }
          if (layerIds.includes('poi-label')) {
            map.setLayoutProperty('poi-label', 'text-field', ['get', 'name_ru']);
          }
        }
      } catch (e) {
        console.log('Language setting failed:', e);
      }
      
      // Скрываем логотип Mapbox и информационную иконку
      const hideMapboxElements = () => {
        if (!mapContainerRef.current) return;
        
        const elementsToHide = [
          '.mapboxgl-ctrl-logo',
          '.mapboxgl-ctrl-attrib',
          '.mapboxgl-ctrl-attrib-button',
          '.mapboxgl-ctrl-attrib-inner',
          '.mapboxgl-ctrl-bottom-right',
          '.mapboxgl-ctrl-bottom-left'
        ];
        
        elementsToHide.forEach(selector => {
          try {
            if (!selector?.trim() || selector.length > 100) return;
            const sanitizedSelector = selector.trim();
            const elements = mapContainerRef.current?.querySelectorAll(sanitizedSelector);
            elements?.forEach((element) => {
              if (element && element instanceof HTMLElement) {
                const htmlElement = element as HTMLElement;
                htmlElement.style.display = 'none';
                htmlElement.style.visibility = 'hidden';
                htmlElement.style.opacity = '0';
                htmlElement.style.pointerEvents = 'none';
                try {
                  htmlElement.remove(); // Полностью удаляем элемент
                } catch (removeError) {
                  console.log('Could not remove element:', removeError);
                }
              }
            });
          } catch (error) {
            console.log('Error hiding element:', selector, error);
          }
        });
      };
      
      // Запускаем несколько раз для надежности
      setTimeout(hideMapboxElements, 100);
      setTimeout(hideMapboxElements, 500);
      setTimeout(hideMapboxElements, 1000);
    });
    
    // Handle loading state with better caching
    map.on('idle', () => {
      setIsLoading(false);
    });
    
    map.on('dataloading', (e: any) => {
      // Only show loading for initial data load, not for cached tiles
      if (e.dataType === 'source' && e.isSourceLoaded === false) {
        setIsLoading(true);
      }
    });
    
    map.on('data', (e: any) => {
      // Hide loading when source data is loaded
      if (e.dataType === 'source' && e.isSourceLoaded) {
        setIsLoading(false);
      }
    });
    
    // Cache tiles for better performance
    map.on('sourcedata', (e: any) => {
      if (e.sourceId && e.isSourceLoaded) {
        setIsLoading(false);
      }
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
      let startPos: { x: number; y: number } | null = null;
      
      map.on('mousedown', (e: any) => {
        startPos = { x: e.point.x, y: e.point.y };
        pressTimer = window.setTimeout(() => {
          console.log('Web long press triggered at:', e.lngLat);
          onLongPress({
            nativeEvent: {
              coordinate: {
                latitude: e.lngLat.lat,
                longitude: e.lngLat.lng
              }
            }
          });
        }, 500);
      });
      
      map.on('mouseup', () => {
        window.clearTimeout(pressTimer);
        startPos = null;
      });
      
      map.on('mousemove', (e: any) => {
        if (startPos) {
          const distance = Math.sqrt(
            Math.pow(e.point.x - startPos.x, 2) + Math.pow(e.point.y - startPos.y, 2)
          );
          // Cancel long press if mouse moved more than 10 pixels
          if (distance > 10) {
            window.clearTimeout(pressTimer);
          }
        }
      });
      
      // Also handle touch events for mobile web
      map.on('touchstart', (e: any) => {
        if (e.originalEvent.touches.length === 1) {
          const touch = e.originalEvent.touches[0];
          startPos = { x: touch.clientX, y: touch.clientY };
          pressTimer = window.setTimeout(() => {
            console.log('Web touch long press triggered at:', e.lngLat);
            onLongPress({
              nativeEvent: {
                coordinate: {
                  latitude: e.lngLat.lat,
                  longitude: e.lngLat.lng
                }
              }
            });
          }, 500);
        }
      });
      
      map.on('touchend', () => {
        window.clearTimeout(pressTimer);
        startPos = null;
      });
      
      map.on('touchmove', (e: any) => {
        if (startPos && e.originalEvent.touches.length === 1) {
          const touch = e.originalEvent.touches[0];
          const distance = Math.sqrt(
            Math.pow(touch.clientX - startPos.x, 2) + Math.pow(touch.clientY - startPos.y, 2)
          );
          // Cancel long press if finger moved more than 10 pixels
          if (distance > 10) {
            window.clearTimeout(pressTimer);
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

    // Check if Mapbox is already loaded
    if (window.mapboxgl && !mapboxLoaded) {
      setMapboxLoaded(true);
      initializeMap();
      return;
    }

    // Load Mapbox GL JS only if not already loaded
    if (!window.mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = () => {
        try {
          const link = document.createElement('link');
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
          link.rel = 'stylesheet';
          if (document.head) {
            document.head.appendChild(link);
          }
          
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
          if (document.head) {
            document.head.appendChild(style);
          }
          
          setMapboxLoaded(true);
          initializeMap();
        } catch (error) {
          console.log('Error loading Mapbox resources:', error);
        }
      };
      
      script.onerror = (error: any) => {
        if (error && typeof error === 'object') {
          console.log('Error loading Mapbox script:', error);
        }
      };
      
      if (document.head) {
        document.head.appendChild(script);
      }
    }

    return () => {
      try {
        if (mapRef.current && typeof mapRef.current.remove === 'function') {
          mapRef.current.remove();
        }
        mapRef.current = null;
      } catch (error) {
        console.log('Error cleaning up map:', error);
      }
    };
  }, [initializeMap, mapboxLoaded]);



  // Handle markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      try {
        if (marker && typeof marker.remove === 'function') {
          marker.remove();
        }
      } catch (error) {
        console.log('Error removing marker:', error);
      }
    });
    markersRef.current = [];

    // Add new markers
    React.Children.forEach(children, (child: any) => {
      if (child && child.props && child.props.coordinate) {
        try {
          const markerElement = document.createElement('div');
          markerElement.innerHTML = child.props.children ? 
            ReactDOMServer.renderToString(child.props.children) : 
            '<div style="width: 20px; height: 20px; background: #FF3B30; border-radius: 50%; border: 2px solid white;"></div>';
          
          if (window.mapboxgl && mapRef.current) {
            const marker = new window.mapboxgl.Marker(markerElement)
              .setLngLat([child.props.coordinate.longitude, child.props.coordinate.latitude])
              .addTo(mapRef.current);
              
            if (child.props.onPress) {
              markerElement.addEventListener('click', child.props.onPress);
            }
            
            markersRef.current.push(marker);
          }
        } catch (error) {
          console.log('Error creating marker:', error);
        }
      }
    });
  }, [children, mapLoaded]);

  return (
    <View style={[styles.webMapContainer, style]} {...otherProps}>
      <div 
        ref={mapContainerRef} 
        style={styles.webMapContainer as any} 
      />
      {(isLoading || !mapboxLoaded) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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