import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, Animated } from 'react-native';

// Mapbox token
const MAPBOX_TOKEN = 'pk.eyJ1IjoicnJheG85NiIsImEiOiJjbWZ0Zzg5bjEwNTJ2MmlwaHNlNnh4ajd2In0.kPa-PYwEP58w8-QJKGHz5A';

// Cache for loaded Mapbox resources
let mapboxResourcesLoaded = false;
let mapboxLoadPromise: Promise<void> | null = null;

// Global map instance cache
let globalMapInstance: any = null;
let globalMapContainer: HTMLDivElement | null = null;
let isMapInitializing = false;

// Web-specific MapView implementation with Mapbox
export const MapView = (props: any) => {
  const { style, children, initialRegion, onPress, onLongPress, ...otherProps } = props;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const markersRef = useRef<any[]>([]);
  const spinValue = useRef(new Animated.Value(0)).current;

  const initializeMap = React.useCallback(() => {
    if (!mapContainerRef.current || !window.mapboxgl || isMapInitializing) return;
    
    // Reuse existing map if available and container is different
    if (globalMapInstance && globalMapContainer !== mapContainerRef.current) {
      try {
        // Move existing map to new container
        const mapCanvas = globalMapContainer?.querySelector('.mapboxgl-canvas');
        if (mapCanvas && mapContainerRef.current) {
          mapContainerRef.current.appendChild(mapCanvas.parentElement!);
          globalMapContainer = mapContainerRef.current;
          mapRef.current = globalMapInstance;
          setMapLoaded(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.log('Error reusing map:', error);
      }
    }
    
    // Create new map only if needed
    if (globalMapInstance) {
      mapRef.current = globalMapInstance;
      setMapLoaded(true);
      setIsLoading(false);
      return;
    }
    
    isMapInitializing = true;
    window.mapboxgl.accessToken = MAPBOX_TOKEN;
    
    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialRegion ? [initialRegion.longitude, initialRegion.latitude] : [28.6134, 59.3733],
      zoom: initialRegion ? 14 : 13,
      language: 'ru',
      attributionControl: false,
      preserveDrawingBuffer: true // Помогает с производительностью
    });

    // Убираем стандартные элементы управления - они будут кастомными

    map.on('load', () => {
      globalMapInstance = map;
      globalMapContainer = mapContainerRef.current;
      isMapInitializing = false;
      setMapLoaded(true);
      setIsLoading(false);
      
      // Set map language to Russian (with error handling)
      try {
        const layers = ['country-label', 'state-label', 'poi-label'];
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
      let pressTimer: number | null = null;
      let startCoords: { lat: number; lng: number } | null = null;
      let startTime: number = 0;
      let hasMoved = false;
      
      const clearTimer = () => {
        if (pressTimer !== null) {
          window.clearTimeout(pressTimer);
          pressTimer = null;
        }
        startCoords = null;
        startTime = 0;
        hasMoved = false;
      };
      
      const triggerLongPress = (coords: { lat: number; lng: number }) => {
        console.log('Long press triggered at:', coords);
        onLongPress({
          nativeEvent: {
            coordinate: {
              latitude: coords.lat,
              longitude: coords.lng
            }
          }
        });
      };
      
      // Mouse events for desktop
      const handleMouseDown = (e: any) => {
        try {
          e.preventDefault();
          startCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
          startTime = Date.now();
          hasMoved = false;
          
          pressTimer = window.setTimeout(() => {
            if (startCoords && !hasMoved) {
              triggerLongPress(startCoords);
              clearTimer();
            }
          }, 600); // Slightly longer for better UX
        } catch (error) {
          console.log('Error in mousedown handler:', error);
        }
      };
      
      const handleMouseUp = (e: any) => {
        try {
          const duration = Date.now() - startTime;
          if (duration >= 600 && startCoords && !hasMoved) {
            triggerLongPress(startCoords);
          }
        } catch (error) {
          console.log('Error in mouseup handler:', error);
        }
        clearTimer();
      };
      
      const handleMouseMove = (e: any) => {
        try {
          if (startCoords) {
            // Check if mouse moved too far from start position
            const distance = Math.sqrt(
              Math.pow(e.lngLat.lat - startCoords.lat, 2) + 
              Math.pow(e.lngLat.lng - startCoords.lng, 2)
            );
            if (distance > 0.0005) { // Smaller threshold for more sensitivity
              hasMoved = true;
              clearTimer();
            }
          }
        } catch (error) {
          console.log('Error in mousemove handler:', error);
        }
      };
      
      // Touch events for mobile/tablet (including Telegram WebApp)
      const handleTouchStart = (e: any) => {
        try {
          if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length === 1) {
            e.preventDefault();
            const touch = e.originalEvent.touches[0];
            const rect = map.getContainer().getBoundingClientRect();
            const point = map.unproject([touch.clientX - rect.left, touch.clientY - rect.top]);
            startCoords = { lat: point.lat, lng: point.lng };
            startTime = Date.now();
            hasMoved = false;
            
            pressTimer = window.setTimeout(() => {
              if (startCoords && !hasMoved) {
                // Add haptic feedback for mobile
                if (navigator.vibrate) {
                  navigator.vibrate(50);
                }
                triggerLongPress(startCoords);
                clearTimer();
              }
            }, 600);
          }
        } catch (error) {
          console.log('Error in touchstart handler:', error);
        }
      };
      
      const handleTouchEnd = (e: any) => {
        try {
          const duration = Date.now() - startTime;
          if (duration >= 600 && startCoords && !hasMoved) {
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
            triggerLongPress(startCoords);
          }
        } catch (error) {
          console.log('Error in touchend handler:', error);
        }
        clearTimer();
      };
      
      const handleTouchMove = (e: any) => {
        try {
          if (startCoords && e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length === 1) {
            const touch = e.originalEvent.touches[0];
            const rect = map.getContainer().getBoundingClientRect();
            const point = map.unproject([touch.clientX - rect.left, touch.clientY - rect.top]);
            
            // Check if touch moved too far from start position
            const distance = Math.sqrt(
              Math.pow(point.lat - startCoords.lat, 2) + 
              Math.pow(point.lng - startCoords.lng, 2)
            );
            if (distance > 0.0005) { // Smaller threshold for more sensitivity
              hasMoved = true;
              clearTimer();
            }
          }
        } catch (error) {
          console.log('Error in touchmove handler:', error);
        }
      };
      
      // Context menu prevention for better long press detection
      const handleContextMenu = (e: any) => {
        e.preventDefault();
        return false;
      };
      
      map.on('mousedown', handleMouseDown);
      map.on('mouseup', handleMouseUp);
      map.on('mousemove', handleMouseMove);
      map.on('touchstart', handleTouchStart);
      map.on('touchend', handleTouchEnd);
      map.on('touchmove', handleTouchMove);
      map.on('contextmenu', handleContextMenu);
      
      // Also add direct DOM event listeners for better mobile support
      const mapContainer = map.getContainer();
      if (mapContainer) {
        mapContainer.addEventListener('contextmenu', handleContextMenu, { passive: false });
        mapContainer.style.touchAction = 'pan-x pan-y'; // Allow panning but prevent other gestures
      }
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

  const loadMapboxResources = React.useCallback(() => {
    if (mapboxResourcesLoaded) {
      return Promise.resolve();
    }
    
    if (mapboxLoadPromise) {
      return mapboxLoadPromise;
    }
    
    mapboxLoadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.mapboxgl) {
        mapboxResourcesLoaded = true;
        resolve();
        return;
      }
      
      // Preload resources with higher priority
      const preloadScript = document.createElement('link');
      preloadScript.rel = 'preload';
      preloadScript.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      preloadScript.as = 'script';
      document.head.appendChild(preloadScript);
      
      const preloadCSS = document.createElement('link');
      preloadCSS.rel = 'preload';
      preloadCSS.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      preloadCSS.as = 'style';
      document.head.appendChild(preloadCSS);
      
      // Load Mapbox GL JS
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.async = true;
      script.onload = () => {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        link.onload = () => {
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
            .mapboxgl-canvas {
              outline: none;
            }
          `;
          document.head.appendChild(style);
          
          mapboxResourcesLoaded = true;
          resolve();
        };
        link.onerror = reject;
        document.head.appendChild(link);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    return mapboxLoadPromise;
  }, []);

  // Spinner animation
  useEffect(() => {
    if (isLoading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => {
        spinAnimation.stop();
        spinValue.setValue(0);
      };
    }
  }, [isLoading, spinValue]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const initMap = async () => {
      try {
        // Show loading only if resources aren't loaded yet
        if (!mapboxResourcesLoaded) {
          setIsLoading(true);
        }
        
        await loadMapboxResources();
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          initializeMap();
        }, 50);
      } catch (error) {
        console.error('Error loading Mapbox resources:', error);
        setIsLoading(false);
      }
    };
    
    initMap();

    return () => {
      try {
        // Clear existing markers but keep map instance
        if (markersRef.current) {
          markersRef.current.forEach(marker => {
            if (marker && typeof marker.remove === 'function') {
              marker.remove();
            }
          });
          markersRef.current = [];
        }
        
        // Don't remove map instance - keep it cached
        mapRef.current = null;
      } catch (error) {
        console.log('Error cleaning up map:', error);
      }
    };
  }, [initializeMap, loadMapboxResources]);



  // Handle markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    try {
      // Clear existing markers
      if (markersRef.current) {
        markersRef.current.forEach(marker => {
          if (marker && typeof marker.remove === 'function') {
            marker.remove();
          }
        });
        markersRef.current = [];
      }

      // Add new markers
      React.Children.forEach(children, (child: any) => {
        if (child && child.props && child.props.coordinate) {
          try {
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
          } catch (error) {
            console.log('Error creating marker:', error);
          }
        }
      });
    } catch (error) {
      console.log('Error handling markers:', error);
    }
  }, [children, mapLoaded]);

  return (
    <View style={[styles.webMapContainer, style]} {...otherProps}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Animated.View 
            style={[
              styles.loadingSpinner,
              {
                transform: [{
                  rotate: spinValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }]
              }
            ]} 
          />
          <Text style={styles.loadingText}>Загрузка карты...</Text>
          <Text style={styles.loadingSubtext}>Подготовка интерактивной карты</Text>
        </View>
      )}
      <div 
        ref={mapContainerRef} 
        style={StyleSheet.flatten([
          styles.webMapContainer as any, 
          {
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }
        ])} 
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#E5E5EA',
    borderTopColor: '#007AFF',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500' as const,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center' as const,
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