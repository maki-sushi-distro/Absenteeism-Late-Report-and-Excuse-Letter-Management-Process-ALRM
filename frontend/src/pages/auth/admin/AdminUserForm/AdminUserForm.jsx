import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import AdminPageLayout from "../AdminPageLayout";
import FormActions from "./FormActions";
import FormField from "./FormField";
import FormMessages from "./FormMessages";
import { useAdminUserForm } from "./useAdminUserForm";

function AdminUserForm({ cancelPath, createUser, fields, initialValues, sectionTitle,
  submitLabel, subtitle, title, validate }) {
  const navigate = useNavigate();
  const form = useAdminUserForm({ createUser, fields, initialValues, title, validate });

  return <AdminPageLayout>
    <div className="mb-6">
      <h1 className="text-2xl font-black tracking-normal text-slate-950">{title}</h1>
      <p className="mt-1 text-sm font-medium text-slate-600">{subtitle}</p>
    </div>
    <Card className="w-full max-w-[960px] rounded-[5px] border border-slate-300 py-0 shadow-none ring-0">
      <CardContent className="px-5 py-7 sm:px-8">
        <form onSubmit={form.handleSubmit} noValidate>
          <FieldSet>
            <FieldLegend className="text-base font-bold text-slate-950">{sectionTitle}</FieldLegend>
            <Separator className="bg-transparent" />
            <FormMessages success={form.success} error={form.submitError || form.programError} />
            <FieldGroup className="grid gap-x-12 gap-y-6 md:grid-cols-2">
              {fields.map((field) => <FormField key={field.name} field={field}
                value={form.values[field.name]} error={form.errors[field.name]}
                onChange={form.handleChange} programOptions={form.programOptions}
                loadingPrograms={form.loadingPrograms} />)}
            </FieldGroup>
            <FormActions onCancel={() => navigate(cancelPath)} submitting={form.submitting} submitLabel={submitLabel} />
          </FieldSet>
        </form>
      </CardContent>
    </Card>
  </AdminPageLayout>;
}

export default AdminUserForm;
