/**
 * SweetAlert helpers used everywhere: toast, confirm, alert, error and dangerous-action confirm.
 *
 * Used by: 16 files (shared), e.g. components/agent/AgentDetail.jsx,
 * components/creditnote/ApplyCreditNoteModal.jsx, components/creditnote/CreateCreditNoteModal.jsx
 */

import Swal from "sweetalert2";

export const showToast = (icon, title) => {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
  return Toast.fire({ icon, title });
};

export const confirmAction = async (title, text, confirmButtonText = "Yes, delete it!") => {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText,
  });
};

export const showAlert = (title, text, icon = "success") => {
  return Swal.fire({ title, text, icon });
};

// Shorthand for the common case: something failed, show the message from
// the caught error (or a fallback) as a themed popup instead of alert().
export const showError = (text) => {
  return Swal.fire({
    title: "Something went wrong",
    text,
    icon: "error",
    confirmButtonColor: "#f97316",
  });
};

// Shorthand for a themed confirm() replacement. Resolves to true/false.
export const confirmDanger = async (title, text, confirmButtonText = "Yes, continue") => {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    confirmButtonText,
  });
  return result.isConfirmed;
};
