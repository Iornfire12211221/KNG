import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// Mapbox token
const MAPBOX_TOKEN = 'pk.eyJ1IjoicnJheG85NiIsImEiOiJjbWZ0Zzg5bjEwNTJ2MmlwaHNlNnh4ajd2In0.kPa-PYwEP58w8-QJKGHz5A';

// Web-specific MapView implementation with Mapbox
export const MapView = (props: any) => {
  const { style, children, initialRegion, onPress, onLongPress, onMapReady, ...otherProps } = props;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const markersRef = useRef<any[]>([]);
  const initializationRef = useRef(false);

  const initializeMap = React.useCallback(() => {
    if (!mapContainerRef.current || !window.mapboxgl || initializationRef.current) return;
    
    initializationRef.current = true;
    window.mapboxgl.accessToken = MAPBOX_TOKEN;
    
    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialRegion ? [initialRegion.longitude, initialRegion.latitude] : [28.6134, 59.3733],
      zoom: initialRegion ? 14 : 13,
      language: 'ru',
      attributionControl: false, // Убираем стандартную атрибуцию
      preserveDrawingBuffer: true, // Улучшает производительность
      antialias: true,
      optimizeForTerrain: true
    });

    // Убираем стандартные элементы управления - они будут кастомными

    map.on('load', () => {
      setMapLoaded(true);
      setIsInitialized(true);
      
      // Вызываем onMapReady если он есть
      if (onMapReady) {
        onMapReady();
      }
      
      // Set map language to Russian
      try {
        map.setLayoutProperty('country-label', 'text-field', ['get', 'name_ru']);
        map.setLayoutProperty('state-label', 'text-field', ['get', 'name_ru']);
        map.setLayoutProperty('settlement-label', 'text-field', ['get', 'name_ru']);
        map.setLayoutProperty('poi-label', 'text-field', ['get', 'name_ru']);
      } catch (e) {
        console.log('Language setting failed:', e);
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
      map.on('mousedown', (e: any) => {
        pressTimer = window.setTimeout(() => {
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
      });
      
      map.on('mousemove', () => {
        window.clearTimeout(pressTimer);
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
  }, [initialRegion, onPress, onLongPress, onMapReady, props.ref]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Проверяем, загружен ли уже Mapbox
    if (window.mapboxgl) {
      initializeMap();
      return;
    }

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
          background-color: #F8F9FA !important;
        }
        .mapboxgl-canvas {
          background-color: #F8F9FA !important;
        }
      `;
      document.head.appendChild(style);
      
      initializeMap();
    };
    document.head.appendChild(script);

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.log('Map cleanup error:', e);
        }
      }
      initializationRef.current = false;
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
        
        // Create a proper marker HTML structure
        if (child.props.children) {
          // Extract marker data from React element
          const markerContainer = child.props.children;
          if (markerContainer && markerContainer.props) {
            const customMarker = markerContainer.props.children[0];
            const markerLabel = markerContainer.props.children[1];
            
            if (customMarker && customMarker.props) {
              const backgroundColor = customMarker.props.style?.backgroundColor || '#FF3B30';
              const borderColor = customMarker.props.style?.borderColor || '#FFFFFF';
              
              // Create marker HTML
              markerElement.innerHTML = `
                <div style="
                  width: 36px;
                  height: 36px;
                  border-radius: 18px;
                  background-color: ${backgroundColor};
                  border: 3px solid ${borderColor};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  cursor: pointer;
                ">
                  <div style="color: white; font-size: 18px; line-height: 1;">📍</div>
                </div>
                ${markerLabel && markerLabel.props ? `
                  <div style="
                    margin-top: 2px;
                    padding: 2px 6px;
                    border-radius: 8px;
                    background-color: ${backgroundColor};
                    color: white;
                    font-size: 10px;
                    font-weight: 700;
                    text-align: center;
                    min-width: 40px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
                  ">
                    ${markerLabel.props.children || ''}
                  </div>
                ` : ''}
              `;
            } else {
              // Fallback marker
              markerElement.innerHTML = `
                <div style="
                  width: 36px;
                  height: 36px;
                  border-radius: 18px;
                  background-color: #FF3B30;
                  border: 3px solid #FFFFFF;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  cursor: pointer;
                ">
                  <div style="color: white; font-size: 18px; line-height: 1;">📍</div>
                </div>
              `;
            }
          } else {
            // Simple fallback
            markerElement.innerHTML = `
              <div style="
                width: 36px;
                height: 36px;
                border-radius: 18px;
                background-color: #FF3B30;
                border: 3px solid #FFFFFF;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: pointer;
              ">
                <div style="color: white; font-size: 18px; line-height: 1;">📍</div>
              </div>
            `;
          }
        } else {
          // Default marker
          markerElement.innerHTML = `
            <div style="
              width: 36px;
              height: 36px;
              border-radius: 18px;
              background-color: #FF3B30;
              border: 3px solid #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              <div style="color: white; font-size: 18px; line-height: 1;">📍</div>
            </div>
          `;
        }
        
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
      {!isInitialized && (
        <View style={styles.mapLoadingContainer}>
          <View style={styles.mapLoadingContent}>
            <Text style={styles.mapLoadingText}>Загрузка карты...</Text>
          </View>
        </View>
      )}
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
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  mapLoadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  mapCanvas: {
    opacity: 1,
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

