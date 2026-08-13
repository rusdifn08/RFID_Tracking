-- Hapus tag zigbee dari device lama (UID 001/002/…); mesh hanya isi ulang dari Coordinator + UID 0001+.
UPDATE devices SET link_type = 'wifi' WHERE link_type = 'zigbee';
