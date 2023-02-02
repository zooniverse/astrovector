$(document).ready(() => {
	// CONSTS
	_.templateSettings = {
		evaluate: /\{\{(.+?)\}\}/g,
		interpolate: /\{\{\=(.+?)\}\}/g,
	};

	let modal_content_tmp = _.template($('#modal-content').html());

	// SETUP
	const render_page = () => {
		if (window.data === false) {
			$('#content-body').html($('#content-login').html());
		} else {
			let stuff = $('#content-collection').html();
			let tmp = _.template(stuff);
			let html = tmp({ data: window.data });
			$('#content-body').html(html);
			$('#collection-images-dropzone').hide();
		}
	}

	// MODAL
	const $modal = document.getElementById('modal-subject');
	const $b_modal = new bootstrap.Modal('#modal-subject');

	let modal_data = {
		subject_id: false,
		type: false,
		is_primary_subject: false,
		is_in_collection: false,
	};

	$modal.addEventListener('show.bs.modal', event => {
		modal_data.subject_id = event.relatedTarget.getAttribute('data-bs-subject');
		modal_data.type = event.relatedTarget.getAttribute('data-bs-type');
		console.log('type', modal_data.type)

		modal_data.is_primary_subject = (data.active_subject_id === modal_data.subject_id);
		modal_data.is_in_collection = (data.collection_subject_ids.indexOf(modal_data.subject_id) > -1);
		$('#modal-subject .modal-dialog').html(modal_content_tmp({ data: modal_data }));
	})

	// ACTIONS
	window.login = (ev) => {
		const collection_name = $('#collection-name').val();
		if (collection_name == '') {
			return alert('Collection Name cannot be empty');
		}

		$('#log-in-button').addClass('disabled');

		window.location = `/${collection_name}`;
		ev.preventDefault();
		return false;
	};

	window.collection_add = () => {
		data.collection_subject_ids.push(modal_data.subject_id);
		$b_modal.hide();
		render_page();
		window.save_update();
	}

	window.collection_remove = () => {
		data.collection_subject_ids.splice(data.collection_subject_ids.indexOf(modal_data.subject_id), 1);
		$b_modal.hide();
		render_page();
		window.save_update();
	}

	window.subject_check = (ev) => {
		const subject = $('#subject-check-id').val();
		ev.preventDefault();

		if (subject == '') {
			return alert('Subject cannot be empty');
		}

		const search_data = {};
		_.extend(search_data, window.data, { search_subject_id: subject })

		$('#subject-check-submit').addClass('disabled').html('Finding subject...');
		$.post(`/subject_search`, search_data, res => {
			$('#subject-check-submit').removeClass('disabled').html('Find Subject');

			if (res.error) {
				alert(res.error);
			} else {
				window.data = res;
				render_page();
			}
		});
	}

	window.subject_remove = () => {
		data.active_subject_id = false;
		data.nn_subject_ids = [];
		$b_modal.hide();
		render_page();
		window.save_update();
	}

	window.subject_active = () => {
		const search_data = {};
		_.extend(search_data, window.data, { search_subject_id: modal_data.subject_id })

		$.post(`/subject_search`, search_data, res => {
			if (res.error) {
				alert(res.error);
			} else {
				console.log('subject_search', res);
				window.data = res;
				$b_modal.hide();
				render_page();
			}
		});
	}

	window.drag_start = (ev) => {
		ev.dataTransfer.setData("subject", ev.target.dataset.subject);
		console.log('start drag');
		$('#collection-images-dropzone').show();
		$('#collection-images-container').hide();

	}

	window.drag_end = (ev) => {
		console.log('drag end');
		$('#collection-images-dropzone').hide();
		$('#collection-images-container').show();
	}

	window.collection_drop = (ev) => {
		ev.preventDefault();
		const subject_id = ev.dataTransfer.getData("subject");
		if (data.collection_subject_ids.indexOf(subject_id) == -1) {
			data.collection_subject_ids.push(subject_id);
		}

		render_page();
		window.save_update();
	}

	window.collection_allow_drop = (ev) => {
		//console.log('allow drop');
		ev.preventDefault();
	}

	window.collection_drag_enter = (ev) => {
		console.log('enter', ev);
	}

	window.collection_drag_leave = (ev) => {
		console.log('leave', ev);
	}

	window.save_update = () => {
		$.post(`/save`, window.data, res => {
			if (res.error) {
				alert(res.error);
			}
		});
	}

	window.nn_update = (size) => {
		window.data.nn_size = size;
		$('.nn-count-option').removeClass('active');
		$(`#nn-dd-${size}`).addClass('active');
		$('#nn-count').html(size);

		window.re_search();
	}

	window.db_update = (db) => {
		window.data.db_type = db;
		$('.db-option').removeClass('active');
		$(`#db-${db}`).addClass('active');
		$('#db-type').html((db === 'vector') ? 'PGVector' : 'Cube');

		window.re_search();
	}

	window.re_search = () => {
		const search_data = {};
		_.extend(search_data, window.data, { search_subject_id: window.data.active_subject_id })

		$.post(`/subject_search`, search_data, res => {
			if (res.error) {
				alert(res.error);
			} else {
				window.data = res;
				render_page();
			}
		});
	}


	// ALL ACTIONS
	render_page();
});