import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-grievances-status-report',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbModule, TableModule, TabsModule],
  templateUrl: './grievances-status-report.html',
  styleUrls: ['./grievances-status-report.scss']
})
export class GrievancesStatusReport implements OnInit {
  items: MenuItem[] | undefined;
  home: MenuItem | undefined;


   grievanceByCounty = [
    { name: 'AWIEL WEST - NGBV', total: 340 },
    { name: 'BOR MUNICIPAL - NGBV', total: 345 },
    { name: 'BOR SOUTH - NGBV', total: 3 },
    { name: 'BOR SOUTH - GBV', total: 1 },
    { name: 'GOGRIAL WEST - NGBV', total: 170 },
    { name: 'JAMJANG - NGBV', total: 599 },
    { name: 'JUBA - NGBV', total: 516 },
    { name: 'KAPOTEA EAST - NGBV', total: 399 },
    { name: 'MABAN - NGBV', total: 673 },
    { name: 'MELITH - NGBV', total: 812 },
    { name: 'MUNDRI WEST - NGBV', total: 928 },
    { name: 'PIBOR - NGBV', total: 621 },
    { name: 'POCHALLA - NGBV', total: 421 },
    { name: 'RAJA - NGBV', total: 155 },
    { name: 'TONJ SOUTH - NGBV', total: 302 },
    { name: 'TORIT MUNICIPAL COUNCIL - NGBV', total: 346 },
    { name: 'YEI - NGBV', total: 192 },
  ];

  grievanceByStatus = [
    { type: 'Resolved (GBV)', total: 1 },
    { type: 'Resolved (NGBV)', total: 6782 },
    { type: 'Unresolved (NGBV)', total: 40 }
  ];

  averageDaysByCounty = [
    { name: 'AWIEL WEST (NGBV)', avgDays: 7 },
    { name: 'BOR MUNICIPAL (NGBV)', avgDays: 39 },
    { name: 'BOR SOUTH (GBV)', avgDays: 172 },
    { name: 'BOR SOUTH (NGBV)', avgDays: 0 },
    { name: 'GOGRIAL WEST (NGBV)', avgDays: 6 },
    { name: 'JAMJANG (NGBV)', avgDays: 75 },
    { name: 'JUBA (NGBV)', avgDays: 41 },
    { name: 'KAPOTEA EAST (NGBV)', avgDays: 77 },
    { name: 'MABAN (NGBV)', avgDays: 62 },
    { name: 'MELITH (NGBV)', avgDays: 49 },
    { name: 'MUNDRI WEST (NGBV)', avgDays: 6 },
    { name: 'PIBOR (NGBV)', avgDays: 29 },
    { name: 'POCHALLA (NGBV)', avgDays: 28 },
    { name: 'RAJA (NGBV)', avgDays: 0 },
    { name: 'TONJ SOUTH (NGBV)', avgDays: 53 },
    { name: 'TORIT MUNICIPAL COUNCIL (NGBV)', avgDays: 41 },
    { name: 'YEI (NGBV)', avgDays: 0 }
  ];

  constructor() {
    // Optional: Logic to process or filter data if needed
    // Example: filter out counties with 0 as total grievances
    this.grievanceByCounty = this.grievanceByCounty.filter(county => county.total > 0);
  }

  ngOnInit() {
    this.items = [{ label: 'Grievance Status Report' }];
    this.home = { icon: 'fas fa-home', routerLink: '/dashboard' };
  }

  downloadReport(): void {
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    const ws1: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.grievanceByCounty);
    XLSX.utils.book_append_sheet(wb, ws1, 'Grievance By County');

    const ws2: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.grievanceByStatus);
    XLSX.utils.book_append_sheet(wb, ws2, 'Grievance By Status');

    const ws3: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.averageDaysByCounty);
    XLSX.utils.book_append_sheet(wb, ws3, 'Avg Days To Close');

    XLSX.writeFile(wb, 'Grievance_Status_Report.xlsx');
  }

}
