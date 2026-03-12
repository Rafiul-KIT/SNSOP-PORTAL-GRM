import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import * as XLSX from 'xlsx';
import { ApiService } from '../../services/api.service';
import { Loader } from "../../components/loader/loader";

interface GrievanceByCounty {
  countyType: string;
  total: number;
}

interface GrievanceByStatus {
  statusType: string;
  total: number;
}

interface AvgDaysToCloseByCounty {
  countyType: string;
  avgDaysToClose: number;
}

interface GrievanceReportResponse {
  grievanceByCounty: GrievanceByCounty[];
  grievanceByStatus: GrievanceByStatus[];
  avgDaysToCloseByCounty: AvgDaysToCloseByCounty[];
}

@Component({
  selector: 'app-grievances-status-report',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbModule, TableModule, TabsModule, Loader],
  templateUrl: './grievances-status-report.html',
  styleUrls: ['./grievances-status-report.scss']
})
export class GrievancesStatusReport implements OnInit {
  private api = inject(ApiService);
   private cdr = inject(ChangeDetectorRef);
  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  grievanceByCounty: GrievanceByCounty[] = [];
  grievanceByStatus: GrievanceByStatus[] = [];
  avgDaysToCloseByCounty: AvgDaysToCloseByCounty[] = [];
   loading = true;
  isLoading = false;

  constructor() { }

  ngOnInit() {
    this.items = [{ label: 'Grievance Status Report' }];
    this.home = { icon: 'fas fa-home', routerLink: '/dashboard' };
    this.fetchReport();
  }

  fetchReport() {
    this.api.GET<GrievanceReportResponse>('api/grievance/report')
      .then(res => {
        if (res.data) {
          this.grievanceByCounty = res.data.grievanceByCounty || [];
          this.grievanceByStatus = res.data.grievanceByStatus || [];
          this.avgDaysToCloseByCounty = res.data.avgDaysToCloseByCounty || [];
        }
      })
      .catch(err => {
        console.error('Error fetching grievance report', err);
      })
      .finally(() => {
       
        this.loading = false;
        
         this.cdr.detectChanges();
      });
  }

  downloadReport(): void {
    const formatData = (data: any[], headers: Record<string, string>) => {
      if (!data || data.length === 0) return '';
      const mappedData = data.map(item => {
        const newItem: any = {};
        for (const key in headers) {
          newItem[headers[key]] = item[key];
        }
        return newItem;
      });
      const ws = XLSX.utils.json_to_sheet(mappedData);
      return XLSX.utils.sheet_to_csv(ws);
    };

    let csvContent = '';

    csvContent += 'TYPE OF GRIEVANCE BY COUNTY\n';
    csvContent += formatData(this.grievanceByCounty, { 'countyType': 'County - Type', 'total': 'Total' });
    csvContent += '\n\n';

    csvContent += 'AVERAGE DAYS TO CLOSE BY COUNTY\n';
    csvContent += formatData(this.avgDaysToCloseByCounty, { 'countyType': 'County - Type', 'avgDaysToClose': 'Avg Days to Close' });
    csvContent += '\n\n';

    csvContent += 'GRIEVANCE BY STATUS\n';
    csvContent += formatData(this.grievanceByStatus, { 'statusType': 'Status - Type', 'total': 'Total' });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Grievance_Status_Report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

}
