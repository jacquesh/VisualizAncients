@echo off
REM We specify implicit:class (which is the default) to stop it complaining about generation of class 
REM files for annotations, its important to note however, that implicitly compiled files are not
REM subject to annotation processing, so if we need that then we need to add more source files here
javac -implicit:class -cp .;.\deps\* -d .\classfiles Main.java
