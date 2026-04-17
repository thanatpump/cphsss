CREATE TABLE signstmm (id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT, stmno TEXT, dateDue TEXT, hmain TEXT, hcode TEXT, hproc TEXT, hn TEXT, an TEXT, pid TEXT, name TEXT, dateadm TEXT, datedsc TEXT, ft TEXT, bf TEXT, drg TEXT, rw REAL, adjrw REAL, due INTEGER, ptype INTEGER, rwtype TEXT, rptype TEXT, rid TEXT, pstm INTEGER, careas TEXT, sc INTEGER, ed INTEGER, Reimb REAL, Nreimb REAL, Copay REAL, CP TEXT, PP TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE signstms (id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT, stmno TEXT, dateDue TEXT, hcode TEXT, hmain TEXT, hproc TEXT, hn TEXT, an TEXT, pid TEXT, name TEXT, dateadm TEXT, datedsc TEXT, ft TEXT, bf TEXT, drg TEXT, rw REAL, adjrw REAL, due INTEGER, ptype INTEGER, rwtype TEXT, mtype TEXT, rptype TEXT, rid TEXT, pstm INTEGER, careas TEXT, sc INTEGER, ed INTEGER, Reimb REAL, Nreimb REAL, Copay REAL, CP TEXT, PP TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE sognstmm (id INTEGER PRIMARY KEY AUTOINCREMENT, STMdoc TEXT, dateStart TEXT, dateEnd TEXT, dateDue TEXT, dateIssue TEXT, station TEXT, hmain TEXT, hproc TEXT, hcare TEXT, hn TEXT, pid TEXT, name TEXT, bf TEXT, pcode TEXT, care TEXT, payplan TEXT, bp TEXT, invno TEXT, dttran TEXT, copay TEXT, cfh TEXT, total REAL, rid TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE sognstmp (id INTEGER PRIMARY KEY AUTOINCREMENT, STMdoc TEXT, dateStart TEXT, dateEnd TEXT, dateDue TEXT, dateIssue TEXT, station TEXT, hmain TEXT, hproc TEXT, hcare TEXT, hn TEXT, pid TEXT, name TEXT, invno TEXT, bf TEXT, pcode TEXT, care TEXT, payplan TEXT, bp TEXT, dttran TEXT, copay TEXT, cfh TEXT, total REAL, ExtP TEXT, rid TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE hospcode (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amp_name TEXT,
          amppart TEXT,
          chwpart TEXT,
          hospcode TEXT,
          name TEXT,
          tmbpart TEXT,
          moopart TEXT,
          hospital_type_id TEXT,
          bed_count TEXT,
          po_code TEXT,
          province_name TEXT,
          addr TEXT,
          area_code TEXT,
          zone TEXT,
          region_id TEXT,
          hospcode_5_digit TEXT,
          hospcode_9_digit TEXT
        );
CREATE TABLE amppart (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amppart TEXT,
          chwpart TEXT,
          name TEXT
        );
