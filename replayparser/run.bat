@echo off
java -Dlogback.statusListenerClass=ch.qos.logback.core.status.NopStatusListener -Xms256M -Xmx1024M -cp .\classfiles;.\deps\* Main %1
