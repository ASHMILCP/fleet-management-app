'use client';

import React, { useState, useEffect } from 'react';
import { FleetStore } from '@/lib/store';
import { Company } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CompanyModal } from '@/components/admin/CompanyModal';
import {
  Building2,
  Plus,
  Phone,
  Mail,
  IndianRupee,
  Edit2,
  Power,
  Trash2,
  Search,
} from 'lucide-react';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const loadData = async () => {
    setCompanies(FleetStore.getCompanies());
    await FleetStore.syncWithSupabase();
    setCompanies(FleetStore.getCompanies());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingCompany(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    FleetStore.toggleCompanyStatus(id);
    loadData();
  };

  const handleDeleteCompany = (company: Company) => {
    if (confirm(`Are you sure you want to delete company "${company.name}"?`)) {
      FleetStore.deleteCompany(company.id);
      loadData();
    }
  };

  const filteredCompanies = companies.filter((c) => {
    if (!c) return false;
    const query = searchQuery.toLowerCase();
    const name = c.name || '';
    const contact = c.contact_person || '';
    const phone = c.phone || '';
    return (
      name.toLowerCase().includes(query) ||
      contact.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <span>Client Companies Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage corporate accounts, contacts, and per-kilometer billing rates
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Client Company
        </Button>
      </div>

      {/* FILTER & STATS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company name, contact, phone..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Showing {filteredCompanies.length} of {companies.length} corporate accounts</span>
        </div>
      </div>

      {/* COMPANIES TABLE */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Company Name</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Phone / Email</th>
                <th className="py-3.5 px-4 text-right">Billing Rate</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span>{company.name}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-slate-700 font-medium">
                    {company.contact_person || <span className="text-slate-400">-</span>}
                  </td>

                  <td className="py-4 px-4 text-slate-600 text-xs font-mono">
                    <div>{company.phone || 'N/A'}</div>
                    {company.email && <div className="text-[11px] text-slate-400 truncate">{company.email}</div>}
                  </td>

                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    {company.billing_rate_per_km ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        ₹{company.billing_rate_per_km}/KM
                      </span>
                    ) : (
                      <span className="text-slate-400">Standard</span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-center">
                    <Badge variant={company.is_active ? 'success' : 'neutral'} size="sm">
                      {company.is_active ? 'Active Client' : 'Inactive'}
                    </Badge>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(company)}
                        title="Edit Company"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(company.id)}
                        title={company.is_active ? 'Deactivate Company' : 'Activate Company'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          company.is_active
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteCompany(company)}
                        title="Delete Company"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        company={editingCompany}
        onSave={loadData}
      />
    </div>
  );
}
