import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GrievanceDashboard } from './grievance-dashboard';
import { ApiService } from '../../services/api.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AxiosResponse } from 'axios';

describe('GrievanceDashboard', () => {
  let component: GrievanceDashboard;
  let fixture: ComponentFixture<GrievanceDashboard>;
  let mockApiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    mockApiService = jasmine.createSpyObj('ApiService', ['GET']);

    await TestBed.configureTestingModule({
      imports: [GrievanceDashboard, BrowserAnimationsModule],
      providers: [{ provide: ApiService, useValue: mockApiService }],
    }).compileComponents();

    fixture = TestBed.createComponent(GrievanceDashboard);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have activeTab as string "0"', () => {
    expect(component.activeTab).toBe('0');
  });

  it('should fetch dashboard data on init', async () => {
    const mockResponse: AxiosResponse = {
      data: {
        ngbvData: {
          grievancesByStatus: [{ status: 'Resolved', count: 100 }],
          grievancesByType: [{ type: 'Type1', count: 50 }],
          grievancesByLocation: [{ county: 'County1', count: 30 }],
          averageResolutionTimeByLocation: [{ county: 'County1', averageResolutionTime: 5 }],
        },
        gbvData: {
          grievancesByStatus: [{ status: 'Pending', count: 20 }],
          grievancesByLocation: [{ county: 'County2', count: 10 }],
          averageResolutionTimeByLocation: [{ county: 'County2', averageResolutionTime: 3 }],
          typesOfReferralMade: [{ referralService: 'Service1', count: 5 }],
          sentToReferralServices: [{ title: 'Service1', count: 5 }],
          perpetratorAssociatedWithProject: [{ title: 'Yes', count: 3 }],
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as any },
    };

    mockApiService.GET.and.returnValue(Promise.resolve(mockResponse));

    component.ngOnInit();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockApiService.GET).toHaveBeenCalledWith('/api/grievance/dashboard');
    expect(component.ngbvTotalCases).toBe(100);
    expect(component.gbvTotalCases).toBe(20);
  });

  it('should handle API error gracefully', async () => {
    mockApiService.GET.and.returnValue(Promise.reject(new Error('Network error')));

    component.ngOnInit();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(component.error).toBe('Failed to load dashboard data. Please try again later.');
    expect(component.loading).toBeFalse();
  });

  it('should format resolution time correctly', () => {
    expect(component.formatResolutionTime(5.23)).toBe('5.2 days');
    expect(component.formatResolutionTime(0)).toBe('N/A');
  });
});
