import { MedplumClient } from '@medplum/core';

export const getMedplumClient = () => {
  return new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URI ?? 'https://api.medplum.com.ar',
  });
};
