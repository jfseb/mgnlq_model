SET ABOT_MONGODB=
SET ABOT_MODELPATH=

del smbmodel\_cache.js.zip

@rem do not use any file cache
SET MGNLQ_MODEL_NO_FILECACHE=1
$Env:MGNLQ_MODEL_NO_FILECACHE=1

@rem use db !
SET MGNLQ_TESTMODEL2_REPLAY=
SET MGNLQ_TESTMODEL_REPLAY=OFF

@rem to record, set this to record
@rem SET MGNLQ_TESTMODEL_REPLAY=RECORD

@rem write a run record
SET ABOT_WRITE_REGRESS=
