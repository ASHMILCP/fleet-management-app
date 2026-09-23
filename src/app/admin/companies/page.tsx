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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
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
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Add Client Company
        </Button>
      </div>

      {/* FILTER & STATS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
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

      {/* COMPANIES LIST / TABLE */}
      <Card>
        {/* DESKTOP TABLE VIEW (>= md) */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* MOBILE CARDS VIEW (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm truncate">{company.name}</div>
                </div>
                <Badge variant={company.is_active ? 'success' : 'neutral'} size="sm">
                  {company.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Billing Rate:</span>
                {company.billing_rate_per_km ? (
                  <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    ₹{company.billing_rate_per_km}/KM
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Standard</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact</span>
                  <span className="font-medium text-slate-800">{company.contact_person || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                  {company.phone ? (
                    <a href={`tel:${company.phone}`} className="text-blue-600 font-mono font-medium hover:underline">
                      {company.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </div>
                {company.email && (
                  <div className="col-span-2 pt-1 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                    <a href={`mailto:${company.email}`} className="text-blue-600 text-xs truncate hover:underline block">
                      {company.email}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(company)}
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(company.id)}
                  leftIcon={<Power className="w-3.5 h-3.5" />}
                  className={company.is_active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}
                >
                  {company.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <button
                  onClick={() => handleDeleteCompany(company)}
                  title="Delete Company"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 hover:border-rose-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No Companies Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your client company directory is empty. Click &quot;Add Client Company&quot; above to register corporate accounts.
            </p>
            <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add First Company
            </Button>
          </div>
        )}
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
