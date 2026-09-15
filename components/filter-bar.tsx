import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Hub } from "@/features/hod-approvals/types";

export function FilterBar({
  path,
  search,
  status,
  hubId,
  hubs,
  dateFrom,
  dateTo,
  approver,
  watcher,
  showAdvancedFilters = false
}: {
  path: string;
  search?: string;
  status?: string;
  hubId?: string;
  hubs: Hub[];
  dateFrom?: string;
  dateTo?: string;
  approver?: string;
  watcher?: string;
  showAdvancedFilters?: boolean;
}) {
  return (
    <form method="get" action={path} className="surface flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
      <div className="form-field flex-1">
        <label htmlFor="search" className="text-xs font-medium text-muted-foreground">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="search" name="search" defaultValue={search ?? ""} placeholder="Request ID, title, requester" className="pl-9" />
        </div>
      </div>
      <div className="form-field w-full lg:w-48">
        <label htmlFor="status" className="text-xs font-medium text-muted-foreground">Status</label>
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="QUESTION_RAISED">Question Raised</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>
      <div className="form-field w-full lg:w-52">
        <label htmlFor="hubId" className="text-xs font-medium text-muted-foreground">Hub</label>
        <Select id="hubId" name="hubId" defaultValue={hubId ?? ""}>
          <option value="">All hubs</option>
          {hubs.map((hub) => (
            <option key={hub.id} value={hub.id}>{hub.name}</option>
          ))}
        </Select>
      </div>
      {showAdvancedFilters ? (
        <>
          <div className="form-field w-full lg:w-44">
            <label htmlFor="dateFrom" className="text-xs font-medium text-muted-foreground">Created From</label>
            <Input id="dateFrom" type="date" name="dateFrom" defaultValue={dateFrom ?? ""} />
          </div>
          <div className="form-field w-full lg:w-44">
            <label htmlFor="dateTo" className="text-xs font-medium text-muted-foreground">Created To</label>
            <Input id="dateTo" type="date" name="dateTo" defaultValue={dateTo ?? ""} />
          </div>
          <div className="form-field w-full lg:w-52">
            <label htmlFor="approver" className="text-xs font-medium text-muted-foreground">Approver Email</label>
            <Input id="approver" name="approver" defaultValue={approver ?? ""} placeholder="name@spxexpress.com" />
          </div>
          <div className="form-field w-full lg:w-52">
            <label htmlFor="watcher" className="text-xs font-medium text-muted-foreground">Watcher Email</label>
            <Input id="watcher" name="watcher" defaultValue={watcher ?? ""} placeholder="name@spxexpress.com" />
          </div>
        </>
      ) : null}
      <Button type="submit" variant="secondary">Apply Filters</Button>
    </form>
  );
}
