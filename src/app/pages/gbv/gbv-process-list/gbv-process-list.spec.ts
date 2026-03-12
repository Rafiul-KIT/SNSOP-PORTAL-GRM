import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GbvProcessList } from './gbv-process-list';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

describe('GbvProcessList', () => {
  let component: GbvProcessList;
  let fixture: ComponentFixture<GbvProcessList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GbvProcessList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GbvProcessList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
