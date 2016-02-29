javac -implicit:class -cp .:./deps/* -d ./classfiles Reparser.java;
java -Dlogback.statusListenerClass=ch.qos.logback.core.status.NopStatusListener -cp ./classfiles:./deps/* Reparser
