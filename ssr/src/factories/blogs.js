import clientInstance from './client-instance';
import serverInstance from './server-instance';

const blogResource = {
	getBlogs: function() {
		return clientInstance.get('/blogs');
	},
	getBlogById: function(id) {
		return clientInstance.get('/blogs/' + id);
	},
	getBlogsByArchives: function() {
		return clientInstance.get('/blogs/archives');
	}
}

export default blogResource;