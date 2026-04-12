import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface ITCategory {
  id: number;
  name: string;
  description: string;
}

export interface ITModule {
  id: number;
  name: string;
  description: string;
}

export interface ITAttachment {
  id: number;
  requestId: number;
  path: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  createdBy: number;
  createdAt: string;
  downloadUrl: string;
}

export interface ITHistory {
  id: number;
  requestId: number;
  action: string;
  changes: string;
  comment: string;
  performedBy: number;
  performedAt: string;
}

export interface ITRequest {
  id: number;
  trackingNumber: string;
  title: string;
  description: string;
  categoryId: number;
  categoryName: string;
  moduleId: number;
  moduleName: string;
  priority: string;
  status: string;
  comment: string;
  createdBy: number;
  createdAt: string;
  updatedBy: number;
  updatedAt: string;
  attachmentCount?: number;
  attachments?: ITAttachment[];
  history?: ITHistory[];
}

export interface ITApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  path: string;
  data: T;
}

export interface ITSearchParams {
  status?: string;
  categoryId?: number;
  moduleId?: number;
  priority?: string;
  trackingNumber?: string;
  search?: string;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ItSupportService {
  private readonly baseEndpoint = 'api/v1/it-support';

  constructor(private api: ApiService) {}

  async getCategories(): Promise<ITCategory[]> {
    try {
      const res = await this.api.GET<any>(`${this.baseEndpoint}/categories`);
      const response = res?.data;
      if (response?.success && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  }

  async getModules(): Promise<ITModule[]> {
    try {
      const res = await this.api.GET<any>(`${this.baseEndpoint}/modules`);
      const response = res?.data;
      if (response?.success && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  }

  async getRequests(params: ITSearchParams = {}): Promise<{ items: ITRequest[]; total: number }> {
    const queryParams: Record<string, any> = {};
    
    if (params.status) queryParams['status'] = params.status;
    if (params.categoryId) queryParams['categoryId'] = params.categoryId;
    if (params.moduleId) queryParams['moduleId'] = params.moduleId;
    if (params.priority) queryParams['priority'] = params.priority;
    if (params.trackingNumber) queryParams['trackingNumber'] = params.trackingNumber;
    if (params.search) queryParams['search'] = params.search;
    if (params.page !== undefined) queryParams['page'] = params.page;
    if (params.size !== undefined) queryParams['size'] = params.size;

    try {
      const res = await this.api.GET<any>(`${this.baseEndpoint}/requests`, queryParams);
      const response = res?.data;
      if (response?.success) {
        const items = Array.isArray(response.data) ? response.data : [];
        return { items, total: items.length };
      }
      return { items: [], total: 0 };
    } catch {
      return { items: [], total: 0 };
    }
  }

  async getRequestById(id: number): Promise<ITRequest | null> {
    try {
      const res = await this.api.GET<any>(`${this.baseEndpoint}/requests/${id}`);
      const response = res?.data;
      if (response?.success) {
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getRequestByTrackingNumber(trackingNumber: string): Promise<ITRequest | null> {
    try {
      const res = await this.api.GET<any>(`${this.baseEndpoint}/requests/tracking/${trackingNumber}`);
      const response = res?.data;
      if (response?.success) {
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  async createRequest(payload: {
    title: string;
    description: string;
    categoryId: number;
    moduleId: number;
    priority: string;
    files?: File[];
  }): Promise<{ success: boolean; trackingNumber?: string; message?: string }> {
    try {
      const formData = new FormData();
      
      const requestPayload = {
        title: payload.title,
        description: payload.description,
        categoryId: payload.categoryId,
        moduleId: payload.moduleId,
        priority: payload.priority
      };
      
      formData.append('payload', new Blob([JSON.stringify(requestPayload)], { type: 'application/json' }));
      
      if (payload.files && payload.files.length > 0) {
        payload.files.forEach((file) => {
          if (file) {
            formData.append('files', file, file.name);
          }
        });
      }

      const res = await this.api.POST_FORM<any>(`${this.baseEndpoint}/requests`, formData);
      const response = res?.data;
      return {
        success: response?.success || false,
        trackingNumber: response?.data?.trackingNumber,
        message: response?.message
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.response?.data?.detail || 'Failed to create request'
      };
    }
  }
}
