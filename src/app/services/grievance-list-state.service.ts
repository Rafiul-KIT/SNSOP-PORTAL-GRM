import { Injectable } from '@angular/core';

export interface GrievanceListState {
  currentPage: number;
  pageSize: number;
  id: number | null;
  trackingNumber: string;
  stateId: string | null;
  countyId: string | null;
  payamId: string | null;
  bomaId: string | null;
  status: string | number | null;
}

@Injectable({
  providedIn: 'root',
})
export class GrievanceListStateService {
  private readonly state = new Map<string, GrievanceListState>();

  set(key: string, value: GrievanceListState): void {
    this.state.set(key, value);
  }

  get(key: string): GrievanceListState | null {
    return this.state.get(key) ?? null;
  }

  clear(key: string): void {
    this.state.delete(key);
  }
}

