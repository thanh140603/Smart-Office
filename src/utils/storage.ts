import { RoomLayout, WorkspaceState } from '../types/widgets';

const STORAGE_KEY = 'smartoffice.workspace';

export function loadWorkspace(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rooms: [], currentRoomId: null };
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (!parsed.rooms) return { rooms: [], currentRoomId: null };
    return parsed;
  } catch (e) {
    return { rooms: [], currentRoomId: null };
  }
}

export function saveWorkspace(state: WorkspaceState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function upsertRoom(state: WorkspaceState, room: RoomLayout): WorkspaceState {
  const idx = state.rooms.findIndex(r => r.id === room.id);
  const nextRooms = idx >= 0
    ? [...state.rooms.slice(0, idx), room, ...state.rooms.slice(idx + 1)]
    : [...state.rooms, room];
  const next: WorkspaceState = { ...state, rooms: nextRooms };
  saveWorkspace(next);
  return next;
}

export function setCurrentRoom(state: WorkspaceState, roomId: string): WorkspaceState {
  const next: WorkspaceState = { ...state, currentRoomId: roomId };
  saveWorkspace(next);
  return next;
}


