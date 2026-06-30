import { getDB } from '../db';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import { useBalanceStore } from '../store';

export interface OutboxEntry {
  uuid: string;
  household_id: string;
  entity: string;
  action: string;
  payload: string;
  base_version: number;
  device_id: string;
  user_id: string;
  timestamp: string;
  idempotency_key: string;
}

export class SyncService {
  static async getDeviceId() {
    let deviceId = await SecureStore.getItemAsync('device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
      await SecureStore.setItemAsync('device_id', deviceId);
    }
    return deviceId;
  }

  static async pushOutbox() {
    const db = getDB();
    if (!db) return;

    const outboxItems = await db.getAllAsync<OutboxEntry>('SELECT * FROM outbox ORDER BY timestamp ASC');
    if (outboxItems.length === 0) return;

    for (const item of outboxItems) {
      const { data, error } = await supabase.rpc('apply_sync_operation', {
        p_idempotency_key: item.idempotency_key,
        p_household_id: item.household_id,
        p_device_id: item.device_id,
        p_entity_type: item.entity,
        p_action: item.action,
        p_payload: JSON.parse(item.payload),
        p_base_version: item.base_version
      });

      if (error) {
        console.error('Failed to sync item:', error);
        // Stop syncing on first error to preserve order
        break;
      }

      if (data && (data as any).status === 'success' || (data as any).status === 'already_processed') {
        await db.runAsync('DELETE FROM outbox WHERE uuid = ?', [item.uuid]);
      } else {
        console.error('Unknown sync response:', data);
        break;
      }
    }
  }

  static async pullChanges() {
    const db = getDB();
    if (!db) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Get active household (hardcoded for now, but should be retrieved from user state)
    // Actually, we can fetch all changes for all households the user is part of.
    // We'll just rely on RLS and a global cursor for now.
    const cursorRes = await db.getFirstAsync<{last_synced_at: string}>('SELECT last_synced_at FROM sync_cursors WHERE household_id = ?', ['global']);
    const lastSyncedAt = cursorRes?.last_synced_at || new Date(0).toISOString();

    const { data, error } = await supabase
      .from('sync_changes')
      .select('*')
      .gt('created_at', lastSyncedAt)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to pull changes:', error);
      return;
    }

    if (data && data.length > 0) {
      await db.withTransactionAsync(async () => {
        for (const change of data) {
           // Basic optimistic application logic here based on entity_type
           // e.g. if action == 'insert', insert into local DB.
           // For now, this is a placeholder implementation for the architecture.
           console.log('Applying change locally:', change);
        }
        const newest = data[data.length - 1].created_at;
        await db.runAsync(
          'INSERT INTO sync_cursors (household_id, last_synced_at) VALUES (?, ?) ON CONFLICT(household_id) DO UPDATE SET last_synced_at = ?',
          ['global', newest, newest]
        );
      });
    }
  }

  static async sync() {
    const setSyncStatus = useBalanceStore.getState().setSyncStatus;
    setSyncStatus('syncing');
    try {
      await this.pushOutbox();
      await this.pullChanges();
      setSyncStatus('idle');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  }
}
