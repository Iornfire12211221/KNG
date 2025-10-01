import React, { memo, useMemo } from 'react';
import { Platform } from 'react-native';
import MapView from './MapView';
import MapViewWeb from './MapView.web';

// Оптимизированный компонент карты с мемоизацией
const OptimizedMapView = memo((props: any) => {
  // Мемоизируем пропсы для предотвращения лишних ререндеров
  const memoizedProps = useMemo(() => ({
    ...props,
    // Отключаем ненужные функции для слабых устройств
    showsUserLocation: Platform.OS !== 'web' ? props.showsUserLocation : false,
    showsMyLocationButton: false,
    showsCompass: false,
    showsScale: false,
    showsZoomControls: false,
    showsBuildings: Platform.OS === 'web' ? false : props.showsBuildings,
    showsTraffic: false,
    showsIndoors: false,
    showsPointsOfInterest: Platform.OS === 'web' ? false : props.showsPointsOfInterest,
  }), [props]);

  if (Platform.OS === 'web') {
    return <MapViewWeb {...memoizedProps} />;
  }

  return <MapView {...memoizedProps} />;
});

OptimizedMapView.displayName = 'OptimizedMapView';

export default OptimizedMapView;
