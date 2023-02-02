from panoptes_client import Panoptes, Subject
import sys

Panoptes.connect(username='<username>', password='<password>', endpoint='https://panoptes.zooniverse.org')

try:
	sub = Subject(int(sys.argv[1]))
	print(sub.raw['metadata']['!iauname'])
	sys.stdout.flush()
except:
	print('false')
	sys.stdout.flush()