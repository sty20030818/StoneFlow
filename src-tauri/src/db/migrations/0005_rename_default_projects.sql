UPDATE projects
SET name = 'Default Project',
		path = '/Default Project'
WHERE id LIKE '%\_default' ESCAPE '\';
