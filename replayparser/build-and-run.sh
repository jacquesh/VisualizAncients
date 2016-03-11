javac -implicit:class -cp .:./deps/* -d ./classfiles Main.java;
java -Dlogback.statusListenerClass=ch.qos.logback.core.status.NopStatusListener -cp ./classfiles:./deps/* Main $1
