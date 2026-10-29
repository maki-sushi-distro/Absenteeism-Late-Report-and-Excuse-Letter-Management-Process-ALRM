import { createInstructor } from "@/api/adminUsers";
import { AdminUserForm, Mail, User } from "./AdminUserForm";
import { emailPattern } from "@/lib/inputValidation";

const initialValues = {
  fullName: "",
  email: "",
};

const fields = [
  {
    name: "fullName",
    label: "Full Name",
    placeholder: "Enter full name",
    icon: User,
  },
  {
    name: "email",
    label: "Email Address",
    placeholder: "Enter email address",
    type: "email",
    icon: Mail,
  },
];

function validate(values) {
  const errors = {};

  if (!values.fullName.trim()) errors.fullName = "Full name is required.";
  if (!values.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

function AddInstructor() {
  return (
    <AdminUserForm
      title="Add Instructor"
      subtitle="Pre-register an instructor for Google sign-in"
      sectionTitle="Instructor Information"
      submitLabel="Add Instructor"
      cancelPath="/instructors"
      parentLabel="Instructors"
      initialValues={initialValues}
      fields={fields}
      validate={validate}
      createUser={createInstructor}
    />
  );
}

export default AddInstructor;
