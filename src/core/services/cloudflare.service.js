// src/core/services/cloudflare.service.js
const axios = require('axios');
const config = require('../../config');

const CLOUDFLARE_API_BASE_URL = `https://api.cloudflare.com/client/v4`;

const cfApi = axios.create({
  baseURL: CLOUDFLARE_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${config.cloudflare.apiToken}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Membuat CNAME record di Cloudflare.
 * @param {string} subdomain - Bagian subdomain (misal, 'mysite'). Domain utama diambil dari config.
 * @param {string} target - Target CNAME (misal, 'app.wanzofc.xyz').
 * @returns {Promise<object>} Respons dari API Cloudflare.
 */
async function createDnsCnameRecord(subdomain, target = config.cloudflare.mainAppCnameTarget) {
  if (!config.cloudflare.apiToken || !config.cloudflare.zoneId || !target) {
    console.warn('Cloudflare API token, Zone ID, or target CNAME is not configured. DNS record creation skipped.');
    // Di produksi, ini mungkin seharusnya error, atau handle sesuai kebutuhan
    return { success: false, message: 'Cloudflare not configured.', record: null };
  }

  const fullDnsName = `${subdomain}.${config.appHostname}`;
  console.log(`Attempting to create CNAME record: ${fullDnsName} -> ${target}`);

  try {
    const response = await cfApi.post(`/zones/${config.cloudflare.zoneId}/dns_records`, {
      type: 'CNAME',
      name: fullDnsName, // Nama DNS lengkap, e.g., mysite.wanzofc.xyz
      content: target,    // Target CNAME, e.g., app.wanzofc.xyz
      ttl: 1,             // TTL 1 menit (otomatis) atau 120 (minimum untuk non-Enterprise)
      proxied: true       // Gunakan proxy Cloudflare (direkomendasikan)
    });
    console.log('Cloudflare DNS CNAME record created:', response.data.result);
    return { success: true, record: response.data.result };
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
    console.error(`Error creating Cloudflare CNAME record for ${fullDnsName}:`, errorMessage);
    // Periksa jika error karena record sudah ada (code 81057)
    if (error.response?.data?.errors?.[0]?.code === 81057) {
        console.warn(`CNAME record ${fullDnsName} already exists.`);
        // Anda bisa mencoba mengambil record yang ada jika perlu
        return { success: true, message: 'Record already exists.', record: null, alreadyExists: true };
    }
    return { success: false, message: `Failed to create CNAME: ${errorMessage}`, record: null };
  }
}

/**
 * Menghapus DNS record di Cloudflare berdasarkan nama.
 * Biasanya Anda perlu ID record, tapi kita bisa cari ID berdasarkan nama dulu.
 * @param {string} subdomain - Bagian subdomain (misal, 'mysite').
 * @returns {Promise<object>} Respons dari API Cloudflare.
 */
async function deleteDnsCnameRecord(subdomain) {
  if (!config.cloudflare.apiToken || !config.cloudflare.zoneId) {
    console.warn('Cloudflare API token or Zone ID is not configured. DNS record deletion skipped.');
    return { success: false, message: 'Cloudflare not configured.' };
  }

  const fullDnsName = `${subdomain}.${config.appHostname}`;
  console.log(`Attempting to delete CNAME record: ${fullDnsName}`);

  try {
    // 1. Cari ID record berdasarkan nama
    const listResponse = await cfApi.get(`/zones/${config.cloudflare.zoneId}/dns_records`, {
      params: { name: fullDnsName, type: 'CNAME' }
    });

    if (listResponse.data.result && listResponse.data.result.length > 0) {
      const recordId = listResponse.data.result[0].id;
      // 2. Hapus record menggunakan ID
      const deleteResponse = await cfApi.delete(`/zones/${config.cloudflare.zoneId}/dns_records/${recordId}`);
      console.log('Cloudflare DNS CNAME record deleted:', deleteResponse.data.result);
      return { success: true, result: deleteResponse.data.result };
    } else {
      console.warn(`No CNAME record found with name ${fullDnsName} to delete.`);
      return { success: false, message: `No CNAME record found with name ${fullDnsName}.` };
    }
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
    console.error(`Error deleting Cloudflare CNAME record for ${fullDnsName}:`, errorMessage);
    return { success: false, message: `Failed to delete CNAME: ${errorMessage}` };
  }
}

module.exports = {
  createDnsCnameRecord,
  deleteDnsCnameRecord
};