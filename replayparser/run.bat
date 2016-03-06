@echo off
java -Dlogback.statusListenerClass=ch.qos.logback.core.status.NopStatusListener -cp .\classfiles;.\deps\* Main %1
