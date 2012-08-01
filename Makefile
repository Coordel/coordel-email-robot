REPORTER = spec

test: 
	mocha \
		--reporter $(REPORTER) \
		test/*.js
		
.PHONY: test