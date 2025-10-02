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
    
    // Reuse existing map if available
    if (globalMapInstance && globalMapContainer) {
      try {
        // If we have a different container, move the map
        if (globalMapContainer !== mapContainerRef.current) {
          const mapWrapper = globalMapContainer.querySelector('.mapboxgl-map');
          if (mapWrapper && mapContainerRef.current) {
            // Clear the new container first
            mapContainerRef.current.innerHTML = '';
            // Move the map wrapper to new container
            mapContainerRef.current.appendChild(mapWrapper);
            globalMapContainer = mapContainerRef.current;
          }
        }
        
        mapRef.current = globalMapInstance;
        setMapLoaded(true);
        setIsLoading(false);
        
        // Update initial region if provided - DISABLED to prevent auto-centering on Kingisepp
        if (initialRegion) {
          console.log('🚫🚫🚫 globalMapInstance.flyTo DISABLED (preventing auto-center on Kingisepp) 🚫🚫🚫:', initialRegion);
          // ОТКЛЮЧАЕМ автоматическое центрирование на Кингисеппе
          // globalMapInstance.flyTo({
          //   center: [initialRegion.longitude, initialRegion.latitude],
          //   zoom: 14,
          //   duration: 0 // Instant for cached map
          // });
        }
        
        return;
      } catch (error) {
        console.log('Error reusing map:', error);
        // If reuse fails, create new map
        globalMapInstance = null;
        globalMapContainer = null;
      }
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
      preserveDrawingBuffer: true, // Помогает с производительностью
      projection: 'mercator',
      pitchWithRotate: false,
      dragRotate: false,
    });

    // Убираем стандартные элементы управления - они будут кастомными

    map.on('load', () => {
      globalMapInstance = map;
      globalMapContainer = mapContainerRef.current;
      // Экспортируем глобальный экземпляр карты для внешнего использования
      (window as any).globalMapInstance = map;
      isMapInitializing = false;
      setMapLoaded(true);
      setIsLoading(false);
      
      console.log('Map loaded and cached successfully');
      try {
        if (map.getProjection && typeof map.getProjection === 'function') {
          map.setProjection('mercator');
        } else if (typeof (map as any).setProjection === 'function') {
          (map as any).setProjection('mercator');
        }
        map.setPitch(0);
        map.setBearing(0);
      } catch (e) {
        console.log('Projection setup error:', e);
      }
      
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
        console.log('Map clicked at:', e.lngLat);
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

    // Добавляем обработчики зума для принудительного обновления маркеров
    const updateAllMarkers = () => {
      console.log('Updating all markers, count:', markersRef.current.length);
      markersRef.current.forEach((marker, index) => {
        if (marker && marker._onZoom) {
          try {
            marker._onZoom();
          } catch (error) {
            console.log(`Error updating marker ${index}:`, error);
          }
        }
      });
    };

    map.on('zoom', updateAllMarkers);
    map.on('zoomend', updateAllMarkers);
    map.on('move', updateAllMarkers);
    map.on('moveend', updateAllMarkers);

    if (onLongPress) {
      let pressTimer: number | null = null;
      let startCoords: { lat: number; lng: number } | null = null;
      let startTime: number = 0;
      let hasMoved = false;
      let isMapMoving = false;
      let startPixelCoords: { x: number; y: number } | null = null;
      
      const clearTimer = () => {
        if (pressTimer !== null) {
          window.clearTimeout(pressTimer);
          pressTimer = null;
        }
        startCoords = null;
        startPixelCoords = null;
        startTime = 0;
        hasMoved = false;
        isMapMoving = false;
      };
      
      const triggerLongPress = (coords: { lat: number; lng: number }) => {
        console.log('Long press triggered at:', coords);
        console.log('Calling onLongPress with event:', {
          nativeEvent: {
            coordinate: {
              latitude: coords.lat,
              longitude: coords.lng
            }
          }
        });
        onLongPress({
          nativeEvent: {
            coordinate: {
              latitude: coords.lat,
              longitude: coords.lng
            }
          }
        });
      };
      
      // Track map movement to prevent long press during zoom/pan
      const handleMapMoveStart = () => {
        isMapMoving = true;
        clearTimer();
      };
      
      const handleMapMoveEnd = () => {
        setTimeout(() => {
          isMapMoving = false;
        }, 100); // Small delay to prevent immediate triggering
      };
      
      // Mouse events for desktop
      const handleMouseDown = (e: any) => {
        try {
          // Don't start long press if map is currently moving
          if (isMapMoving) return;
          
          // Only handle left mouse button
          if (e.originalEvent && e.originalEvent.button !== 0) return;
          
          startCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
          startPixelCoords = { x: e.point.x, y: e.point.y };
          startTime = Date.now();
          hasMoved = false;
          
          pressTimer = window.setTimeout(() => {
            if (startCoords && !hasMoved && !isMapMoving) {
              triggerLongPress(startCoords);
              clearTimer();
            }
          }, 400); // 400ms delay for long press
        } catch (error) {
          console.log('Error in mousedown handler:', error);
        }
      };
      
      const handleMouseUp = (e: any) => {
        try {
          const duration = Date.now() - startTime;
          if (duration >= 400 && startCoords && !hasMoved && !isMapMoving) {
            triggerLongPress(startCoords);
          }
        } catch (error) {
          console.log('Error in mouseup handler:', error);
        }
        clearTimer();
      };
      
      const handleMouseMove = (e: any) => {
        try {
          if (startPixelCoords && !isMapMoving) {
            // Check pixel distance to be more accurate
            const pixelDistance = Math.sqrt(
              Math.pow(e.point.x - startPixelCoords.x, 2) + 
              Math.pow(e.point.y - startPixelCoords.y, 2)
            );
            if (pixelDistance > 10) { // 10 pixels threshold
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
          // Don't start long press if map is currently moving
          if (isMapMoving) return;
          
          // Only handle single touch
          if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length === 1) {
            const touch = e.originalEvent.touches[0];
            const rect = map.getContainer().getBoundingClientRect();
            const point = map.unproject([touch.clientX - rect.left, touch.clientY - rect.top]);
            startCoords = { lat: point.lat, lng: point.lng };
            startPixelCoords = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
            startTime = Date.now();
            hasMoved = false;
            
            pressTimer = window.setTimeout(() => {
              if (startCoords && !hasMoved && !isMapMoving) {
                // Add haptic feedback for mobile
                if (navigator.vibrate) {
                  navigator.vibrate(50);
                }
                triggerLongPress(startCoords);
                clearTimer();
              }
            }, 400); // 400ms delay for mobile
          }
        } catch (error) {
          console.log('Error in touchstart handler:', error);
        }
      };
      
      const handleTouchEnd = (e: any) => {
        try {
          const duration = Date.now() - startTime;
          if (duration >= 400 && startCoords && !hasMoved && !isMapMoving) {
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
          if (startPixelCoords && e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length === 1 && !isMapMoving) {
            const touch = e.originalEvent.touches[0];
            const rect = map.getContainer().getBoundingClientRect();
            
            // Check pixel distance for touch movement
            const pixelDistance = Math.sqrt(
              Math.pow((touch.clientX - rect.left) - startPixelCoords.x, 2) + 
              Math.pow((touch.clientY - rect.top) - startPixelCoords.y, 2)
            );
            if (pixelDistance > 15) { // 15 pixels threshold for touch
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
      
      // Add map movement listeners
      map.on('movestart', handleMapMoveStart);
      map.on('moveend', handleMapMoveEnd);
      map.on('zoomstart', handleMapMoveStart);
      map.on('zoomend', handleMapMoveEnd);
      map.on('rotatestart', handleMapMoveStart);
      map.on('rotateend', handleMapMoveEnd);
      map.on('pitchstart', handleMapMoveStart);
      map.on('pitchend', handleMapMoveEnd);
      map.touchZoomRotate.disableRotation();
      
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
        
        // Добавляем обработчик клика для мобильных устройств
        mapContainer.addEventListener('click', (e: any) => {
          console.log('Map container clicked');
          if (onPress) {
            const rect = mapContainer.getBoundingClientRect();
            const point = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
            onPress({
              nativeEvent: {
                coordinate: {
                  latitude: point.lat,
                  longitude: point.lng
                }
              }
            });
          }
        });
      }
    }

    mapRef.current = map;
    
    // Expose map methods
    if (props.ref) {
      props.ref.current = {
        animateToRegion: (region: any, duration = 1000) => {
          console.log('🚫🚫🚫 animateToRegion called (ENABLED) 🚫🚫🚫:', {
            region,
            duration,
            stack: new Error().stack
          });
          // ВКЛЮЧАЕМ центрирование карты для кнопки и показа маркера пользователя
          console.log('🚫🚫🚫 animateToRegion ENABLED - centering map 🚫🚫🚫');
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
      
      // Preload resources with higher priority and correct crossorigin
      const preloadScript = document.createElement('link');
      preloadScript.rel = 'preload';
      preloadScript.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      preloadScript.as = 'script';
      preloadScript.crossOrigin = 'anonymous';
      document.head.appendChild(preloadScript);
      
      const preloadCSS = document.createElement('link');
      preloadCSS.rel = 'preload';
      preloadCSS.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      preloadCSS.as = 'style';
      preloadCSS.crossOrigin = 'anonymous';
      document.head.appendChild(preloadCSS);
      
      // Load Mapbox GL JS
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        link.crossOrigin = 'anonymous';
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
        // If we already have a cached map, show it immediately
        if (globalMapInstance && mapboxResourcesLoaded) {
          setIsLoading(false);
          initializeMap();
          return;
        }
        
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
            if (marker && (marker as any)._onZoom && mapRef.current && mapRef.current.off) {
              try { 
                mapRef.current.off('zoom', (marker as any)._onZoom);
                mapRef.current.off('zoomend', (marker as any)._onZoom);
                mapRef.current.off('move', (marker as any)._onZoom);
                mapRef.current.off('moveend', (marker as any)._onZoom);
              } catch {}
            }
            if (marker && (marker as any)._intervalId) {
              clearInterval((marker as any)._intervalId);
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



  // Функция для принудительного обновления масштабирования всех маркеров
  const forceUpdateMarkers = React.useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    try {
      const z = mapRef.current.getZoom ? mapRef.current.getZoom() : 14;
      console.log('Force updating markers for zoom level:', z);
      
      // Обновляем все существующие маркеры
      markersRef.current.forEach((marker) => {
        if (marker && marker._onZoom) {
          marker._onZoom();
        }
      });
    } catch (error) {
      console.log('Error force updating markers:', error);
    }
  }, [mapLoaded]);

  // Экспортируем функцию для внешнего использования
  React.useImperativeHandle(props.ref, () => ({
    ...(props.ref?.current || {}),
    forceUpdateMarkers,
  }), [forceUpdateMarkers]);

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
            const customHtml = (child.props as any).html as string | undefined;
            
            if (customHtml) {
              markerElement.innerHTML = customHtml;
            } else if (child.props.children) {
              // Создаем маркер события
              // Создаем маркер точно как в событиях
              const postType = (child.props as any).postType || 'other';
              const severity = (child.props as any).severity || 'medium';
              const colors = {
                dps: '#FF3B30',
                patrol: '#007AFF', 
                accident: '#FF9500',
                camera: '#34C759',
                roadwork: '#FF9500',
                animals: '#8E44AD',
                other: '#6C757D'
              };
              const color = colors[postType as keyof typeof colors] || '#6C757D';
              
              // Создаем функцию для генерации HTML маркера (минималистичный дизайн)
              const createMarkerHTML = (scale: number) => {
                // Базовый размер меньше и без текста
                const size = Math.max(16, Math.min(24, 20 * scale));
                const iconSize = Math.max(8, Math.min(12, 10 * scale));
                const borderWidth = Math.max(1, 1.5 * scale);
                
                return `
                  <div style="
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease-out;
                  ">
                    <div style="
                      width: ${size}px;
                      height: ${size}px;
                      border-radius: 50%;
                      background: ${color};
                      border: ${borderWidth}px solid #FFFFFF;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
                      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                      cursor: pointer;
                      transform: scale(1);
                    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"
                    >
                      ${getIconHTML(postType, iconSize)}
                    </div>
                  </div>
                `;
              };
              
              // Создаем аккуратные иконки как на втором скрине
              const getIconHTML = (type: string, size: number) => {
                const strokeWidth = Math.max(2, size * 0.15);
                const iconSize = size;
                
                switch (type) {
                  case 'dps': 
                    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M12 8v4"/>
                      <path d="M12 16h.01"/>
                    </svg>`;
                  case 'patrol': 
                    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>`;
                  case 'accident': 
                    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <path d="M12 9v4"/>
                      <path d="M12 17h.01"/>
                    </svg>`;
                  case 'camera': 
                    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>`;
                  case 'roadwork': 
                    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>`;
                  case 'animals': 
                    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M13 16a3 3 0 0 1 2.24 5"/>
                      <path d="M18 12h.01"/>
                      <path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"/>
                    </svg>`;
                  default: 
                    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                    </svg>`;
                }
              };
              
              const getTypeLabel = (type: string) => {
                switch (type) {
                  case 'dps': return 'ДПС';
                  case 'patrol': return 'Патруль';
                  case 'accident': return 'ДТП';
                  case 'camera': return 'Камера';
                  case 'roadwork': return 'Ремонт';
                  case 'animals': return 'Животные';
                  default: return 'Другое';
                }
              };
              
              
              markerElement.innerHTML = createMarkerHTML(1);
            } else {
              markerElement.innerHTML = '<div style="width: 20px; height: 20px; background: #FF3B30; border-radius: 50%; border: 2px solid white;"></div>';
            }
            
            // Check if this is a user location marker
            const isUserMarker = markerElement.querySelector('[data-role="user-marker"]') !== null;
            
            // Ensure pointer alignment is centered
            const marker = new window.mapboxgl.Marker({ element: markerElement, anchor: 'center' })
              .setLngLat([child.props.coordinate.longitude, child.props.coordinate.latitude])
              .addTo(mapRef.current);
              
            if (child.props.onPress) {
              markerElement.addEventListener('click', child.props.onPress);
            }
            
            // Масштабирование маркеров с зумом карты - оптимизированная версия
            if (mapRef.current) {
              let lastZoomLevel = -1; // Кэшируем последний уровень зума
              
              const applyScale = () => {
                try {
                  const z = mapRef.current.getZoom ? mapRef.current.getZoom() : 14;
                  
                  // Проверяем, изменился ли зум значительно (оптимизация)
                  if (Math.abs(z - lastZoomLevel) < 0.05) {
                    return; // Не обновляем, если зум изменился незначительно
                  }
                  lastZoomLevel = z;
                  console.log('Zoom level changed to:', z);
                  
                  if (isUserMarker) {
                    // Специальная обработка для маркера пользователя - более агрессивное уменьшение
                    let userScale;
                    if (z <= 6) {
                      userScale = Math.max(0.1, 0.1 + (z - 3) * 0.05);
                    } else if (z <= 10) {
                      userScale = 0.25 + (z - 6) * 0.1;
                    } else if (z <= 14) {
                      userScale = 0.65 + (z - 10) * 0.08;
                    } else {
                      userScale = Math.min(1.0, 0.97 + (z - 14) * 0.01);
                    }
                    
                    const size = Math.max(8, Math.min(20, 16 * userScale));
                    const innerSize = size * 0.6;
                    const borderWidth = Math.max(1, 1.5 * userScale);
                    const shadowBlur = Math.max(1, 3 * userScale);
                    
                    markerElement.innerHTML = `
                      <div data-role="user-marker" style="
                        position: relative;
                        width: ${size}px;
                        height: ${size}px;
                        pointer-events: none;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease-out;
                      ">
                        <!-- Пульсирующий круг -->
                        <div style="
                          position: absolute;
                          width: ${size * 1.5}px;
                          height: ${size * 1.5}px;
                          border-radius: 50%;
                          background: rgba(0, 122, 255, 0.08);
                          animation: pulse 8s infinite;
                          z-index: 1;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                        "></div>
                        <!-- Основной маркер -->
                        <div style="
                          width: ${innerSize}px;
                          height: ${innerSize}px;
                          border-radius: 50%;
                          background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
                          border: ${borderWidth}px solid #FFFFFF;
                          box-shadow: 0 2px ${shadowBlur}px rgba(0, 122, 255, 0.3);
                          transition: all 0.3s ease-out;
                          z-index: 2;
                          position: relative;
                        "></div>
                      </div>
                      <style>
                        @keyframes pulse {
                          0% {
                            transform: translate(-50%, -50%) scale(0.9);
                            opacity: 0.3;
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.1);
                            opacity: 0.1;
                          }
                          100% {
                            transform: translate(-50%, -50%) scale(1.2);
                            opacity: 0;
                          }
                        }
                      </style>
                    `;
                  } else {
                    // Маркеры событий - полностью исчезают при зуме <= 11
                    // Находим внутренний элемент для применения transform
                    const innerElement = markerElement.firstElementChild as HTMLElement;
                    
                    if (z <= 11) {
                      // При зуме <= 11 - ПОЛНОСТЬЮ СКРЫВАЕМ маркеры
                      markerElement.style.opacity = '0';
                      markerElement.style.pointerEvents = 'none';
                      markerElement.style.visibility = 'hidden';
                      if (innerElement) {
                        innerElement.style.transform = 'scale(0)';
                        innerElement.style.transition = 'transform 0.3s ease-out';
                      }
                      console.log(`❌ Event marker HIDDEN at zoom ${z.toFixed(2)}`);
                    } else if (z <= 13) {
                      // Зум 11-13 - появляются маленькими
                      markerElement.style.opacity = '1';
                      markerElement.style.pointerEvents = 'auto';
                      markerElement.style.visibility = 'visible';
                      if (innerElement) {
                        innerElement.style.transform = 'scale(0.7)';
                        innerElement.style.transition = 'transform 0.3s ease-out';
                      }
                      console.log(`✅ Event marker VISIBLE at zoom ${z.toFixed(2)} (scale 0.7)`);
                    } else if (z <= 15) {
                      // Зум 13-15 - средние
                      markerElement.style.opacity = '1';
                      markerElement.style.pointerEvents = 'auto';
                      markerElement.style.visibility = 'visible';
                      if (innerElement) {
                        innerElement.style.transform = 'scale(0.85)';
                        innerElement.style.transition = 'transform 0.3s ease-out';
                      }
                      console.log(`✅ Event marker VISIBLE at zoom ${z.toFixed(2)} (scale 0.85)`);
                    } else if (z <= 17) {
                      // Зум 15-17 - большие
                      markerElement.style.opacity = '1';
                      markerElement.style.pointerEvents = 'auto';
                      markerElement.style.visibility = 'visible';
                      if (innerElement) {
                        innerElement.style.transform = 'scale(0.95)';
                        innerElement.style.transition = 'transform 0.3s ease-out';
                      }
                      console.log(`✅ Event marker VISIBLE at zoom ${z.toFixed(2)} (scale 0.95)`);
                    } else {
                      // Зум > 17 - полный размер
                      markerElement.style.opacity = '1';
                      markerElement.style.pointerEvents = 'auto';
                      markerElement.style.visibility = 'visible';
                      if (innerElement) {
                        innerElement.style.transform = 'scale(1)';
                        innerElement.style.transition = 'transform 0.3s ease-out';
                      }
                      console.log(`✅ Event marker VISIBLE at zoom ${z.toFixed(2)} (scale 1.0)`);
                    }
                    // Плавный переход для opacity и visibility - 0.3 секунды
                    markerElement.style.transition = 'opacity 0.3s ease-out, visibility 0.3s ease-out';
                  }
                } catch (error) {
                  // Silently handle errors to avoid performance impact
                }
              };
              
              // Применяем масштаб сразу
              applyScale();
              
              // Оптимизированные обработчики событий зума
              let zoomTimeout: NodeJS.Timeout;
              const onZoom = () => {
                // Уменьшенный дебаунсинг для лучшей отзывчивости
                clearTimeout(zoomTimeout);
                zoomTimeout = setTimeout(() => {
                  console.log('Applying scale to marker');
                  applyScale();
                }, 50); // Even faster for better responsiveness
              };
              
              // Добавляем обработчики событий зума
              mapRef.current.on('zoom', onZoom);
              mapRef.current.on('zoomend', onZoom);
              mapRef.current.on('move', onZoom);
              mapRef.current.on('moveend', onZoom);
              
              // Уменьшаем интервал обновления для лучшей отзывчивости
              const intervalId = setInterval(() => {
                if (mapRef.current) {
                  applyScale();
                }
              }, 200); // Even faster for better responsiveness
              
              // Сохраняем interval для очистки
              (marker as any)._intervalId = intervalId;
              
              // Сохраняем ссылку для очистки
              (marker as any)._onZoom = onZoom;
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
    
    // Обработка View компонентов
    if (element.type === 'div' || element.type?.displayName === 'View') {
      const style = element.props?.style || {};
      const styleStr = Object.entries(style)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');
      
      // Рекурсивно обрабатываем дочерние элементы
      const children = element.props?.children;
      let childrenHtml = '';
      if (Array.isArray(children)) {
        childrenHtml = children.map(child => ReactDOMServer.renderToString(child)).join('');
      } else if (children) {
        childrenHtml = ReactDOMServer.renderToString(children);
      }
      
      return `<div style="${styleStr}">${childrenHtml}</div>`;
    }
    
    // Обработка иконок (Lucide React)
    if (element.type?.displayName?.includes('Icon') || element.props?.size) {
      const size = element.props?.size || 24;
      const color = element.props?.color || '#000000';
      const iconName = element.type?.displayName || 'Icon';
      
      // Создаем SVG иконку
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${getIconPath(iconName)}
        </svg>
      `;
    }
    
    return '';
  }
};

// Функция для получения SVG путей для иконок
const getIconPath = (iconName: string): string => {
  const iconPaths: { [key: string]: string } = {
    'Shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'Car': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 9.6c-.3-.8-1-1.3-1.9-1.3H7.5c-.9 0-1.6.5-1.9 1.3L4.5 11.1C3.7 11.3 3 12.1 3 13v3c0 .6.4 1 1 1h2"/>',
    'AlertTriangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'Camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    'Construction': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    'Rabbit': '<path d="M13 16a3 3 0 0 1 2.24 5"/><path d="M18 12h.01"/><path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"/>',
    'MoreHorizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'
  };
  
  return iconPaths[iconName] || '<circle cx="12" cy="12" r="3"/>';
};