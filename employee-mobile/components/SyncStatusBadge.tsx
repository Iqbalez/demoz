import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getQueueSize } from '../utils/offlineQueue';

export function SyncStatusBadge() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchQueue = async () => {
      const count = await getQueueSize();
      setPendingCount(count);
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, styles.green]} />
        <Text style={styles.text}>Synced</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, styles.amber]} />
      <Text style={styles.text}>{pendingCount} pending sync</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  green: {
    backgroundColor: '#10b981',
  },
  amber: {
    backgroundColor: '#f59e0b',
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
