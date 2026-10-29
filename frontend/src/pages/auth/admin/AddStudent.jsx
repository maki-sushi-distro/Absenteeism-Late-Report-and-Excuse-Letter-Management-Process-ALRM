import { createStudent } from "@/api/adminUsers";
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

function AddStudent() {
  return (
    <AdminUserForm
      title="Add Student"
      subtitle="Pre-register a student for Google sign-in"
      sectionTitle="Student Information"
      submitLabel="Add Student"
      cancelPath="/students"
      parentLabel="Students"
      initialValues={initialValues}
      fields={fields}
      validate={validate}
      createUser={createStudent}
    />
  );
}

export default AddStudent;
