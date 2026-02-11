#!/bin/bash
/usr/bin/dig @127.0.0.1 google.com +time=2 +tries=1 > /dev/null 2>&1
