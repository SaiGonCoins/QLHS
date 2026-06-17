import axiosInstance from "./axiosInstance";

export const downloadStudentReport = async (studentId, studentName) => {
  const response = await axiosInstance.get(
    `/reports/students/${studentId}/learning`,
    {
      responseType: 'blob'
    }
  );

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute(
    'download',
    `Bao_Cao_Hoc_Tap_${studentName}_${new Date().toISOString().slice(0, 10)}.pdf`
  );

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
};